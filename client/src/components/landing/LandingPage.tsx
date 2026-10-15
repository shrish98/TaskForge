'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Github } from 'lucide-react';
import { Mark } from '@/components/brand/Mark';
import { WorkerTimeline } from '@/components/console/WorkerTimeline';
import { TaskType, TimelineRun, TASK_TYPES } from '@/services/task.service';

const REPO = 'https://github.com/shrish98/TaskForge';

/* A scripted 14-second loop of runs for the hero, drawn by the same timeline component the
   console uses. It is labelled as simulated; signed-in users see their own runs. */
type Script = [type: TaskType, title: string, start: number, duration: number, outcome: 'COMPLETED' | 'FAILED', attempt: number, error?: string];
const SCRIPT: Script[] = [
  ['WEB_SCRAPE', 'Scrape “Message queue”', 0.0, 0.4, 'COMPLETED', 1],
  ['FILE_PROCESSING', 'Read invoice INV-2290', 0.2, 1.9, 'COMPLETED', 1],
  ['NOTIFICATION_DISPATCH', 'Notify billing', 0.6, 0.3, 'FAILED', 1, 'HTTP 503'],
  ['DATA_EXPORT', 'Export failed tasks', 1.1, 0.5, 'COMPLETED', 1],
  ['NOTIFICATION_DISPATCH', 'Notify billing', 2.9, 0.3, 'FAILED', 2, 'HTTP 503'],
  ['REPORT_GENERATION', 'Monthly report', 3.2, 1.4, 'COMPLETED', 1],
  ['FILE_PROCESSING', 'Read receipt #13', 3.6, 1.6, 'COMPLETED', 1],
  ['NOTIFICATION_DISPATCH', 'Notify billing', 7.2, 0.2, 'COMPLETED', 3],
  ['FILE_PROCESSING', 'Read invoice INV-2291', 7.4, 2.4, 'COMPLETED', 1],
  ['WEB_SCRAPE', 'Scrape “Hacker News”', 7.9, 0.6, 'COMPLETED', 1],
  ['NOTIFICATION_DISPATCH', 'Order webhook', 8.4, 0.3, 'FAILED', 3, 'HTTP 500'],
];
const LOOP_S = 11;

function useDemoRuns(): TimelineRun[] {
  const [epoch] = useState(() => Date.now());
  const [now, setNow] = useState(epoch);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, []);

  return useMemo(() => {
    const elapsed = ((now - epoch) / 1000) % LOOP_S;
    const loopStart = now - elapsed * 1000;
    return SCRIPT.filter(([, , start]) => start <= elapsed).map(([type, title, start, duration, outcome, attempt, error], i) => {
      const done = start + duration <= elapsed;
      const startedAt = loopStart + start * 1000;
      return {
        id: `demo-${i}`,
        number: attempt,
        worker: 'demo',
        outcome: done ? outcome : 'RUNNING',
        error: done ? error : null,
        startedAt: new Date(startedAt).toISOString(),
        endedAt: done ? new Date(startedAt + duration * 1000).toISOString() : null,
        task: { id: `demo-task-${i}`, title, type, maxAttempts: 3, progress: Math.min(99, Math.round(((elapsed - start) / duration) * 100)) },
      };
    });
  }, [now, epoch]);
}

const JOBS: Array<{ type: TaskType; does: string; payload: string }> = [
  { type: 'FILE_PROCESSING', does: 'Downloads an image and reads its text with Tesseract, in its own thread so the API stays responsive.', payload: '{ "imageUrl": "https://…/scan.png" }' },
  { type: 'WEB_SCRAPE', does: 'Fetches a page and pulls out the title, headings, links and the text of any CSS selector.', payload: '{ "url": "https://…", "selector": "h2" }' },
  { type: 'REPORT_GENERATION', does: 'Builds a PDF of your task history (status counts, run times by type) straight from Postgres.', payload: '{}' },
  { type: 'DATA_EXPORT', does: 'Pages through your tasks in batches and writes a CSV, with spreadsheet formula injection defused.', payload: '{ "status": "FAILED" }' },
  { type: 'NOTIFICATION_DISPATCH', does: 'POSTs a JSON event signed with HMAC-SHA256, carrying an Idempotency-Key so receivers can drop repeats.', payload: '{ "webhookUrl": "https://…" }' },
];

const FLOW = [
  ['POST /api/v1/tasks', 'Payload validated against the job type. Optional Idempotency-Key, claimed with Redis SET NX.'],
  ['Postgres', 'The task row is the source of truth: status, progress, attempts, result, logs.'],
  ['BullMQ in Redis', 'The job carries only ids. Priority, delay and 3 attempts with exponential backoff.'],
  ['Worker', 'Loads the task, runs the handler, writes each step to Postgres before the job settles.'],
  ['Redis pub/sub', 'Every change is published, so a worker in another container can still reach the browser.'],
  ['Socket.IO', 'The API forwards each event to the owner’s room. The dashboard only polls if the socket drops.'],
];

const FAILURES = [
  { title: 'Retries with backoff', body: 'Three attempts, 2 s then 4 s apart. A webhook that returns 503 twice and then 200 ends up done.', demo: ['bad', 'bad', 'ok'] },
  { title: 'No pointless retries', body: 'A 404, a private address or a non-image URL throws an UnrecoverableError and fails at once.', demo: ['bad', 'empty', 'empty'] },
  { title: 'Dead-letter queue', body: 'Jobs out of attempts are parked with their error. Retrying one starts it over with fresh attempts.', demo: ['bad', 'bad', 'bad'] },
  { title: 'Graceful shutdown', body: 'On SIGTERM the worker stops taking jobs and finishes the ones it has before the process exits.', demo: ['ok', 'live', 'empty'] },
];

const NUMBERS = [
  ['60 ms', 'median API latency while 50 OCR jobs run'],
  ['3.05 / s', 'OCR jobs drained, one laptop'],
  ['1.1 ms', 'Redis round trip from the API'],
  ['70', 'unit + integration tests in CI'],
];

function Dots({ states }: { states: string[] }) {
  return (
    <span className="inline-flex gap-[3px]">
      {states.map((s, i) => (
        <span
          key={i}
          className={`h-[7px] w-[7px] rounded-full border ${
            s === 'bad' ? 'border-bad bg-bad' : s === 'ok' ? 'border-ok bg-ok' : s === 'live' ? 'animate-blink border-amber bg-amber' : 'border-faint/70'
          }`}
        />
      ))}
    </span>
  );
}

export const LandingPage: React.FC = () => {
  const runs = useDemoRuns();
  // The demo is built from the current time, so draw it only in the browser to keep the
  // server render and the first client render identical.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-8 px-6">
          <Link href="/" className="flex items-center gap-2.5 text-[15px] font-semibold text-strong">
            <Mark /> TaskForge
          </Link>
          <nav className="hidden gap-6 text-[13px] text-mute md:flex">
            <a href="#jobs" className="hover:text-strong">Jobs</a>
            <a href="#flow" className="hover:text-strong">How it runs</a>
            <a href="#failure" className="hover:text-strong">Failure handling</a>
            <a href="#numbers" className="hover:text-strong">Numbers</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <a href={REPO} className="btn btn-ghost hidden sm:inline-flex" target="_blank" rel="noreferrer">
              <Github className="h-4 w-4" /> Source
            </a>
            <Link href="/login" className="btn btn-primary">
              Open the console <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-14 pt-16 sm:pt-20">
        <p className="eyebrow animate-fade-up">Express · BullMQ · Redis · Postgres · Socket.IO</p>
        <h1 className="mt-4 max-w-4xl animate-fade-up text-[40px] font-semibold leading-[1.05] tracking-[-0.035em] text-strong [animation-delay:60ms] sm:text-[56px]">
          A job queue you can <span className="text-amber">watch work.</span>
        </h1>
        <p className="mt-5 max-w-2xl animate-fade-up text-[16px] leading-relaxed text-mute [animation-delay:120ms]">
          TaskForge takes heavy work off the request path. OCR, scraping, PDF reports, CSV exports and signed webhooks run on BullMQ
          workers, retry with backoff, park in a dead-letter queue when they can’t succeed, and stream every step to your browser.
        </p>
        <div className="mt-8 flex animate-fade-up flex-wrap gap-3 [animation-delay:180ms]">
          <Link href="/login" className="btn btn-primary h-10 px-4 text-[14px]">
            Try it with the demo account <ArrowRight className="h-4 w-4" />
          </Link>
          <a href={`${REPO}#readme`} className="btn btn-ghost h-10 px-4 text-[14px]" target="_blank" rel="noreferrer">
            Read how it’s built
          </a>
        </div>

        <div className="mt-14 animate-fade-up border border-line bg-panel [animation-delay:240ms]">
          <div className="flex items-center gap-3 border-b border-line px-5 py-3">
            <span className="text-[13px] font-semibold text-strong">Worker timeline</span>
            <span className="font-mono text-[11.5px] text-faint">simulated · sign in to see your own jobs</span>
            <span className="ml-auto flex items-center gap-2 font-mono text-[11.5px] text-ok">
              <span className="h-[7px] w-[7px] animate-blink rounded-full bg-ok" /> live
            </span>
          </div>
          <div className="px-5 pb-3 pt-6">
            {mounted ? <WorkerTimeline runs={runs} onOpen={() => undefined} /> : <div className="h-[100px]" />}
          </div>
        </div>
      </section>

      <section id="numbers" className="border-y border-line">
        <div className="mx-auto grid max-w-6xl grid-cols-2 md:grid-cols-4">
          {NUMBERS.map(([value, label]) => (
            <div key={label} className="border-r border-line px-6 py-7 last:border-r-0 [&:nth-child(2)]:border-r-0 md:[&:nth-child(2)]:border-r">
              <p className="font-mono text-[28px] text-strong">{value}</p>
              <p className="mt-1 text-[13px] text-mute">{label}</p>
            </div>
          ))}
        </div>
        <p className="mx-auto max-w-6xl border-t border-line px-6 py-3 font-mono text-[11.5px] text-faint">
          Measured with the repo’s load test (autocannon, 20 connections) on a Ryzen 5 5500U, Postgres and Redis in Docker on the same machine.
        </p>
      </section>

      <section id="jobs" className="mx-auto max-w-6xl px-6 py-20">
        <p className="eyebrow">What runs on the workers</p>
        <h2 className="mt-3 max-w-2xl text-[28px] font-semibold tracking-[-0.025em] text-strong">Five job types. Each one does the real thing.</h2>
        <div className="mt-10 border-t border-line">
          {JOBS.map((job) => (
            <div key={job.type} className="grid gap-2 border-b border-line py-5 md:grid-cols-[180px_1fr_300px] md:gap-8">
              <div>
                <p className="text-[14px] font-medium text-strong">{TASK_TYPES[job.type].label}</p>
                <p className="font-mono text-[11.5px] text-faint">{job.type}</p>
              </div>
              <p className="text-[14px] leading-relaxed text-mute">{job.does}</p>
              <code className="self-start rounded border border-line bg-panel px-3 py-2 font-mono text-[12px] text-ink">{job.payload}</code>
            </div>
          ))}
        </div>
      </section>

      <section id="flow" className="border-t border-line bg-panel">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="eyebrow">How a task runs</p>
          <h2 className="mt-3 max-w-2xl text-[28px] font-semibold tracking-[-0.025em] text-strong">From one POST to a progress bar in your browser.</h2>
          <ol className="mt-10 grid gap-px border border-line bg-line md:grid-cols-3">
            {FLOW.map(([step, detail], i) => (
              <li key={step} className="bg-panel p-5">
                <p className="font-mono text-[11.5px] text-amber">{String(i + 1).padStart(2, '0')}</p>
                <p className="mt-2 font-mono text-[14px] text-strong">{step}</p>
                <p className="mt-2 text-[13.5px] leading-relaxed text-mute">{detail}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="failure" className="mx-auto max-w-6xl px-6 py-20">
        <p className="eyebrow">When things go wrong</p>
        <h2 className="mt-3 max-w-2xl text-[28px] font-semibold tracking-[-0.025em] text-strong">Built for the jobs that fail.</h2>
        <div className="mt-10 grid gap-8 md:grid-cols-2">
          {FAILURES.map((f) => (
            <div key={f.title} className="border-l-2 border-line pl-5">
              <div className="flex items-center gap-3">
                <h3 className="text-[15px] font-medium text-strong">{f.title}</h3>
                <Dots states={f.demo} />
              </div>
              <p className="mt-2 text-[14px] leading-relaxed text-mute">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-6 px-6 py-8 text-[13px] text-faint">
          <span className="flex items-center gap-2 text-mute">
            <Mark size={16} /> TaskForge
          </span>
          <span>Built by Shrishti Tomar</span>
          <a href={REPO} className="hover:text-strong" target="_blank" rel="noreferrer">GitHub</a>
          <Link href="/login" className="ml-auto text-amber hover:underline">Open the console →</Link>
        </div>
      </footer>
    </div>
  );
};
