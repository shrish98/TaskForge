'use client';

import React from 'react';
import clsx from 'clsx';
import { Task, TaskType, TASK_TYPES } from '@/services/task.service';

/** What a task is doing, in the words the console uses everywhere. */
export type Phase = 'waiting' | 'scheduled' | 'running' | 'retrying' | 'done' | 'dead';

export function phaseOf(task: Pick<Task, 'status' | 'attempts' | 'scheduledAt'>): Phase {
  switch (task.status) {
    case 'PENDING':
      return task.scheduledAt && new Date(task.scheduledAt).getTime() > Date.now() ? 'scheduled' : 'waiting';
    case 'PROCESSING':
      return task.attempts > 1 ? 'retrying' : 'running';
    case 'COMPLETED':
      return 'done';
    default:
      return 'dead';
  }
}

const PHASE_STYLE: Record<Phase, { label: string; className: string }> = {
  waiting: { label: 'waiting', className: 'text-mute' },
  scheduled: { label: 'scheduled', className: 'text-sky' },
  running: { label: 'running', className: 'text-amber' },
  retrying: { label: 'retrying', className: 'text-amber' },
  done: { label: 'done', className: 'text-ok' },
  dead: { label: 'dead letter', className: 'text-bad' },
};

export function StatusTag({ phase }: { phase: Phase }) {
  const { label, className } = PHASE_STYLE[phase];
  return (
    <span className={clsx('inline-flex items-center gap-1.5 whitespace-nowrap font-mono text-[12px] font-medium', className)}>
      <span
        className={clsx('h-1.5 w-1.5 rounded-[1px] bg-current', (phase === 'running' || phase === 'retrying') && 'animate-blink')}
      />
      {label}
    </span>
  );
}

/**
 * One dot per allowed attempt: red for attempts that failed, then green for the one that
 * succeeded, or a pulsing amber one for the attempt running now.
 */
export function AttemptDots({ task }: { task: Pick<Task, 'status' | 'attempts' | 'maxAttempts'> }) {
  const dots = Array.from({ length: task.maxAttempts }, (_, i) => {
    const n = i + 1;
    if (n > task.attempts) return 'empty';
    if (n < task.attempts) return 'failed';
    if (task.status === 'COMPLETED') return 'ok';
    if (task.status === 'FAILED') return 'failed';
    if (task.status === 'PROCESSING') return 'live';
    return 'empty';
  });
  return (
    <span className="inline-flex items-center gap-[3px]" title={`${task.attempts} of ${task.maxAttempts} attempts used`}>
      {dots.map((d, i) => (
        <span
          key={i}
          className={clsx(
            'h-[7px] w-[7px] rounded-full border',
            d === 'empty' && 'border-faint/70',
            d === 'failed' && 'border-bad bg-bad',
            d === 'ok' && 'border-ok bg-ok',
            d === 'live' && 'animate-blink border-amber bg-amber'
          )}
        />
      ))}
    </span>
  );
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <span className={clsx('relative inline-block h-1 w-24 overflow-hidden bg-line align-middle', className)}>
      <span className="absolute inset-y-0 left-0 bg-amber transition-[width] duration-500" style={{ width: `${value}%` }} />
    </span>
  );
}

export function TypeTag({ type }: { type: TaskType }) {
  return <span className="font-mono text-[12px] text-mute">{TASK_TYPES[type]?.short ?? type.toLowerCase()}</span>;
}

export function LiveDot({ on, label }: { on: boolean; label?: string }) {
  return (
    <span className={clsx('inline-flex items-center gap-2 font-mono text-[12px]', on ? 'text-ok' : 'text-amber')}>
      <span className={clsx('h-[7px] w-[7px] rounded-full bg-current', on && 'animate-blink')} />
      {label ?? (on ? 'streaming' : 'reconnecting · polling 5s')}
    </span>
  );
}

export function SectionHead({ title, note, children }: { title: string; note?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline gap-3">
      <h2 className="text-[13px] font-semibold text-strong">{title}</h2>
      {note && <span className="font-mono text-[12px] text-faint">{note}</span>}
      {children && <div className="ml-auto flex items-center gap-2">{children}</div>}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="px-4 py-10 text-center font-mono text-[12px] text-faint">{children}</div>;
}

export function Kpi({ label, value, unit, tone, note }: { label: string; value: React.ReactNode; unit?: string; tone?: 'amber' | 'bad' | 'ok'; note?: string }) {
  return (
    <div className="border-r border-line px-6 py-4 last:border-r-0">
      <p className="eyebrow">{label}</p>
      <p
        className={clsx(
          'mt-1.5 font-mono text-[26px] font-medium tracking-[-0.02em]',
          !tone && 'text-strong',
          tone === 'amber' && 'text-amber',
          tone === 'bad' && 'text-bad',
          tone === 'ok' && 'text-ok'
        )}
      >
        {value}
        {unit && <span className="ml-1 text-[13px] text-faint">{unit}</span>}
      </p>
      {note && <p className="mt-0.5 font-mono text-[11px] text-faint">{note}</p>}
    </div>
  );
}
