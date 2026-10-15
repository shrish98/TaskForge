'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { TimelineRun, TASK_TYPES } from '@/services/task.service';
import { clock, ms } from '@/lib/format';
import { Empty } from './bits';

// Jobs here take milliseconds to a few seconds, so a plain wall-clock axis would draw them as
// slivers across minutes of nothing. Instead, runs that are close together form a burst drawn
// to scale, and the idle time between bursts is collapsed into a marked break.
const BURST_GAP_MS = 6_000;
const BREAK_PCT = 3;
const MIN_BURST_PCT = 10;
const PAD_MS = 250;

interface Placed {
  run: TimelineRun;
  lane: number;
  start: number;
  end: number;
}

interface Burst {
  start: number;
  end: number;
  left: number; // percent
  width: number; // percent
}

function layout(runs: TimelineRun[], now: number) {
  const items = runs
    .map((run) => {
      const start = new Date(run.startedAt).getTime();
      const end = run.endedAt ? new Date(run.endedAt).getTime() : now;
      return { run, start, end: Math.max(end, start + 1) };
    })
    .sort((a, b) => a.start - b.start);

  // Greedy lane packing: each run goes in the first lane that is free when it starts, so the
  // number of lanes in use at any moment is how many jobs were running at once.
  const laneEnds: number[] = [];
  const placed: Placed[] = items.map((item) => {
    let lane = laneEnds.findIndex((end) => end <= item.start);
    if (lane === -1) lane = laneEnds.push(0) - 1;
    laneEnds[lane] = item.end;
    return { ...item, lane };
  });

  const raw: Array<{ start: number; end: number }> = [];
  for (const p of placed) {
    const last = raw[raw.length - 1];
    if (last && p.start - last.end <= BURST_GAP_MS) last.end = Math.max(last.end, p.end);
    else raw.push({ start: p.start, end: p.end });
  }
  raw.forEach((b) => {
    b.start -= PAD_MS;
    b.end += PAD_MS;
  });

  // Share the width out by duration, but give every burst enough room to read.
  const space = 100 - BREAK_PCT * Math.max(0, raw.length - 1);
  const total = raw.reduce((sum, b) => sum + (b.end - b.start), 0);
  let shares = raw.map((b) => Math.max(MIN_BURST_PCT, (space * (b.end - b.start)) / total));
  const scale = space / shares.reduce((a, b) => a + b, 0);
  shares = shares.map((s) => s * scale);

  let cursor = 0;
  const bursts: Burst[] = raw.map((b, i) => {
    const burst = { ...b, left: cursor, width: shares[i] };
    cursor += shares[i] + BREAK_PCT;
    return burst;
  });

  const x = (t: number) => {
    const b = bursts.find((burst) => t <= burst.end) ?? bursts[bursts.length - 1];
    const clamped = Math.min(Math.max(t, b.start), b.end);
    return b.left + ((clamped - b.start) / (b.end - b.start)) * b.width;
  };

  return { placed, bursts, lanes: Math.max(1, laneEnds.length), x };
}

function blockLabel(p: Placed): string {
  if (p.run.outcome === 'FAILED') return /HTTP (\d{3})/.exec(p.run.error ?? '')?.[1] ?? 'failed';
  if (p.run.outcome === 'RUNNING') return `${TASK_TYPES[p.run.task.type].short} · ${p.run.task.progress}%`;
  return `${TASK_TYPES[p.run.task.type].short} · ${ms(p.end - p.start)}`;
}

export function WorkerTimeline({ runs, onOpen }: { runs: TimelineRun[]; onOpen: (taskId: string) => void }) {
  const [now, setNow] = useState(() => Date.now());
  const running = runs.some((r) => r.outcome === 'RUNNING');

  // Running blocks grow in real time.
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [running]);

  // New data moves "now" forward even when nothing is running.
  useEffect(() => setNow(Date.now()), [runs]);

  const { placed, bursts, lanes, x } = useMemo(() => layout(runs, now), [runs, now]);

  // Track width in pixels, so a block only gets a label when the label fits inside it.
  const frameRef = useRef<HTMLDivElement>(null);
  const [trackPx, setTrackPx] = useState(800);
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setTrackPx(entry.contentRect.width - 88));
    observer.observe(el);
    return () => observer.disconnect();
  }, [runs.length === 0]);

  if (runs.length === 0) {
    return (
      <div className="border border-line">
        <Empty>No runs yet. Queue a job and it shows up here while it runs.</Empty>
      </div>
    );
  }

  const last = bursts[bursts.length - 1];
  const showNow = now - last.end < BURST_GAP_MS;

  return (
    <div>
      <div ref={frameRef} className="relative border border-line">
        {Array.from({ length: lanes }, (_, lane) => (
          <div key={lane} className="grid h-[38px] grid-cols-[88px_1fr] border-b border-line last:border-b-0">
            <span className="flex items-center border-r border-line pl-3 font-mono text-[11.5px] text-faint">lane {lane + 1}</span>
            <div className="relative">
              {bursts.slice(1).map((b, i) => (
                <span
                  key={i}
                  className="absolute inset-y-0 bg-[repeating-linear-gradient(135deg,transparent_0_4px,#161a1f_4px_5px)]"
                  style={{ left: `${b.left - BREAK_PCT}%`, width: `${BREAK_PCT}%` }}
                />
              ))}
              {placed
                .filter((p) => p.lane === lane)
                .map((p) => {
                  const left = x(p.start);
                  const width = Math.max(x(p.end) - left, 0.4);
                  const retried = p.run.outcome === 'FAILED' && p.run.number < p.run.task.maxAttempts;
                  const finalFail = p.run.outcome === 'FAILED' && !retried;
                  // Full label if it fits, else just the job type, else nothing.
                  const px = (width / 100) * trackPx;
                  const fitsIn = (text: string) => px >= text.length * 6.6 + 12;
                  const full = blockLabel(p);
                  const short = p.run.outcome === 'FAILED' ? full : TASK_TYPES[p.run.task.type].short;
                  const label = fitsIn(full) ? full : fitsIn(short) ? short : null;
                  return (
                    <button
                      key={p.run.id}
                      type="button"
                      onClick={() => onOpen(p.run.task.id)}
                      title={`${p.run.task.title}\nattempt ${p.run.number}/${p.run.task.maxAttempts} · ${ms(p.end - p.start)}${
                        p.run.error ? `\n${p.run.error}` : ''
                      }`}
                      className={clsx(
                        'absolute top-[7px] h-6 min-w-[5px] overflow-hidden whitespace-nowrap rounded-[2px] px-1.5 text-left font-mono text-[11px] leading-6 transition-[filter] hover:brightness-125',
                        p.run.outcome === 'COMPLETED' && 'bg-ok-block text-bg',
                        p.run.outcome === 'RUNNING' && 'bg-amber text-bg',
                        retried && 'bg-[repeating-linear-gradient(45deg,#d9443c_0_6px,#a8332d_6px_12px)] text-white',
                        finalFail && 'bg-bad-block text-white',
                        p.run.outcome === 'ABANDONED' && 'bg-line text-mute'
                      )}
                      style={{ left: `${left}%`, width: `${width}%` }}
                    >
                      {p.run.outcome === 'RUNNING' && (
                        <span className="pointer-events-none absolute inset-y-0 w-1/3 animate-sweep bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                      )}
                      {label && <span className="relative">{label}</span>}
                    </button>
                  );
                })}
            </div>
          </div>
        ))}
        {showNow && (
          <span className="pointer-events-none absolute inset-y-0 w-px bg-amber" style={{ left: `calc(88px + (100% - 88px) * ${x(now) / 100})` }}>
            <span className="absolute -top-4 -translate-x-1/2 font-mono text-[10px] text-amber">now</span>
          </span>
        )}
      </div>
      <div className="relative ml-[88px] h-5 font-mono text-[10.5px] text-faint">
        {bursts.map((b, i) => (
          <React.Fragment key={i}>
            <span className="absolute top-1.5" style={{ left: `${b.left}%` }}>
              {clock(new Date(b.start + PAD_MS).toISOString(), false)}
            </span>
            {(b.width / 100) * trackPx > 150 && !(showNow && i === bursts.length - 1) && (
              <span className="absolute top-1.5 -translate-x-full" style={{ left: `${b.left + b.width}%` }}>
                {clock(new Date(b.end - PAD_MS).toISOString(), false)}
              </span>
            )}
          </React.Fragment>
        ))}
        {bursts.slice(1).map((b, i) => (
          <span
            key={`gap-${i}`}
            className="absolute top-1.5 -translate-x-1/2 text-[#3d444c]"
            style={{ left: `${b.left - BREAK_PCT / 2}%` }}
            title="idle time collapsed"
          >
            ≈
          </span>
        ))}
      </div>
    </div>
  );
}
