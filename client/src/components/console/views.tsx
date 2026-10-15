'use client';

import React, { useState } from 'react';
import clsx from 'clsx';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { taskService, TaskStatus, TaskType, TASK_TYPES, SystemMetrics, TaskStatsSummary } from '@/services/task.service';
import { ms } from '@/lib/format';
import { Empty, Kpi, SectionHead } from './bits';
import { JobsTable } from './JobsTable';
import { LogStream } from './LogStream';
import { WorkerTimeline } from './WorkerTimeline';

interface ViewProps {
  onOpen: (taskId: string) => void;
  selectedId: string | null;
  isAdmin: boolean;
  live: boolean;
}

// While the socket is down, fall back to polling.
const poll = (live: boolean) => (live ? false : 5000);

/* ------------------------------------------------------------------ overview */

export function OverviewView({ onOpen, selectedId, isAdmin, live, metrics, stats }: ViewProps & { metrics?: SystemMetrics; stats?: TaskStatsSummary }) {
  const timeline = useQuery({ queryKey: ['timeline'], queryFn: () => taskService.getTimeline(60), refetchInterval: poll(live) });
  const recent = useQuery({
    queryKey: ['tasks', 'recent'],
    queryFn: () => taskService.getTasks({ limit: 8, sortBy: 'createdAt', sortOrder: 'desc' }),
    refetchInterval: poll(live),
  });
  const logs = useQuery({ queryKey: ['logs', 'tail'], queryFn: () => taskService.getLogs({ limit: 24 }), refetchInterval: poll(live) });

  return (
    <>
      <div className="grid grid-cols-2 border-b border-line md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Waiting" value={metrics?.queue.waiting ?? '—'} note={metrics?.queue.delayed ? `${metrics.queue.delayed} delayed` : undefined} />
        <Kpi label="Running" value={metrics?.queue.active ?? '—'} tone="amber" note={metrics?.workers ? `${metrics.workers.online} worker${metrics.workers.online === 1 ? '' : 's'} online` : undefined} />
        <Kpi label="Done · 1h" value={metrics?.throughput.completedLastHour ?? '—'} note={stats ? `${stats.completed} all time` : undefined} />
        <Kpi label="Queue wait p50" value={metrics ? ms(metrics.timings.queueWait.p50Ms).split(' ')[0] : '—'} unit={metrics ? ms(metrics.timings.queueWait.p50Ms).split(' ')[1] : undefined} />
        <Kpi label="Run p95" value={metrics ? ms(metrics.timings.run.p95Ms).split(' ')[0] : '—'} unit={metrics ? ms(metrics.timings.run.p95Ms).split(' ')[1] : undefined} />
        <Kpi label="Dead letter" value={stats?.failed ?? '—'} tone={stats?.failed ? 'bad' : undefined} />
      </div>

      <section className="border-b border-line px-6 py-5">
        <SectionHead title="Worker timeline" note="each block is one attempt · lanes are jobs running at once · idle time collapsed (≈)" />
        {timeline.isLoading ? <div className="h-40 animate-pulse border border-line bg-panel" /> : <WorkerTimeline runs={timeline.data ?? []} onOpen={onOpen} />}
        <div className="mt-1 flex flex-wrap gap-5 font-mono text-[11px] text-faint">
          <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 bg-ok-block" />done</span>
          <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 bg-amber" />running</span>
          <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 bg-[repeating-linear-gradient(45deg,#d9443c_0_3px,#a8332d_3px_6px)]" />failed, retried</span>
          <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 bg-bad-block" />failed for good</span>
        </div>
      </section>

      <div className="grid xl:grid-cols-[1.45fr_1fr]">
        <section className="px-6 py-5">
          <SectionHead title="Latest jobs" note="newest first" />
          <div className="overflow-x-auto">
            <div className="min-w-[560px]">
              <JobsTable tasks={recent.data?.tasks ?? []} loading={recent.isLoading} onOpen={(t) => onOpen(t.id)} selectedId={selectedId} showOwner={isAdmin} compact />
            </div>
          </div>
        </section>
        <section className="border-t border-line px-6 py-5 xl:border-l xl:border-t-0">
          <SectionHead title="Log tail" note="newest first" />
          <div className="max-h-[420px] overflow-y-auto">
            <LogStream lines={logs.data?.data ?? []} onOpen={onOpen} compact />
          </div>
        </section>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------------- jobs */

const STATUS_TABS: Array<{ value: TaskStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'all' },
  { value: 'PENDING', label: 'waiting' },
  { value: 'PROCESSING', label: 'running' },
  { value: 'COMPLETED', label: 'done' },
  { value: 'FAILED', label: 'dead letter' },
];

export function JobsView({ onOpen, selectedId, isAdmin, live, initialStatus = 'ALL' }: ViewProps & { initialStatus?: TaskStatus | 'ALL' }) {
  const [status, setStatus] = useState<TaskStatus | 'ALL'>(initialStatus);
  const [type, setType] = useState<TaskType | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', 'list', status, type, search, page],
    queryFn: () =>
      taskService.getTasks({
        status: status === 'ALL' ? undefined : status,
        type: type === 'ALL' ? undefined : type,
        search: search || undefined,
        page,
        limit: 20,
      }),
    refetchInterval: poll(live),
    placeholderData: (prev) => prev,
  });
  const pagination = data?.pagination;

  return (
    <section className="px-6 py-5">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {STATUS_TABS.map((t) => (
            <button key={t.value} type="button" className="tab" aria-pressed={status === t.value} onClick={() => { setStatus(t.value); setPage(1); }}>
              {t.label}
            </button>
          ))}
        </div>
        <select
          value={type}
          onChange={(e) => { setType(e.target.value as TaskType | 'ALL'); setPage(1); }}
          className="field w-auto font-mono text-[12px]"
          aria-label="Job type"
        >
          <option value="ALL">all types</option>
          {(Object.keys(TASK_TYPES) as TaskType[]).map((t) => (
            <option key={t} value={t}>{TASK_TYPES[t].short}</option>
          ))}
        </select>
        <label className="relative ml-auto w-64">
          <Search className="pointer-events-none absolute left-2.5 top-2 h-4 w-4 text-faint" />
          <input className="field pl-8" placeholder="Search titles" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </label>
      </div>

      <div className="overflow-x-auto border border-line">
        <JobsTable tasks={data?.tasks ?? []} loading={isLoading} onOpen={(t) => onOpen(t.id)} selectedId={selectedId} showOwner={isAdmin} />
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-3 flex items-center gap-2 font-mono text-[12px] text-faint">
          <span>
            page {pagination.page} of {pagination.totalPages} · {pagination.total} jobs
          </span>
          <button type="button" className="btn btn-ghost ml-auto h-7" disabled={page <= 1} onClick={() => setPage(page - 1)}>prev</button>
          <button type="button" className="btn btn-ghost h-7" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>next</button>
        </div>
      )}
    </section>
  );
}

/* ----------------------------------------------------------------------- logs */

const LEVELS = ['ALL', 'INFO', 'WARN', 'ERROR'] as const;

export function LogsView({ onOpen, live }: ViewProps) {
  const [level, setLevel] = useState<(typeof LEVELS)[number]>('ALL');
  const [search, setSearch] = useState('');

  const logs = useInfiniteQuery({
    queryKey: ['logs', 'list', level, search],
    queryFn: ({ pageParam }) =>
      taskService.getLogs({ level: level === 'ALL' ? undefined : level, search: search || undefined, before: pageParam, limit: 100 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextBefore ?? undefined,
    refetchInterval: poll(live),
  });
  const lines = (logs.data?.pages ?? []).flatMap((p) => p.data);

  return (
    <section className="px-6 py-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex gap-1">
          {LEVELS.map((l) => (
            <button key={l} type="button" className="tab" aria-pressed={level === l} onClick={() => setLevel(l)}>
              {l.toLowerCase()}
            </button>
          ))}
        </div>
        <label className="relative ml-auto w-72">
          <Search className="pointer-events-none absolute left-2.5 top-2 h-4 w-4 text-faint" />
          <input className="field pl-8" placeholder="Search messages or job titles" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
      </div>
      <div className="overflow-x-auto border border-line bg-panel px-4 py-2">
        <div className="min-w-[720px]">{logs.isLoading ? <Empty>loading…</Empty> : <LogStream lines={lines} onOpen={onOpen} />}</div>
      </div>
      {logs.hasNextPage && (
        <button type="button" className="btn btn-ghost mt-3" onClick={() => logs.fetchNextPage()} disabled={logs.isFetchingNextPage}>
          {logs.isFetchingNextPage ? 'loading…' : 'load older'}
        </button>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------- metrics */

function Cell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="border-b border-r border-line px-4 py-3">
      <p className="eyebrow">{label}</p>
      <p className="mt-1 font-mono text-[18px] text-strong">{value ?? 'n/a'}</p>
    </div>
  );
}

export function MetricsView({ metrics, stats }: { metrics?: SystemMetrics; stats?: TaskStatsSummary }) {
  if (!metrics) return <Empty>loading metrics…</Empty>;
  const finished = (stats?.completed ?? 0) + (stats?.failed ?? 0);

  return (
    <div className="px-6 py-5">
      <p className="mb-5 max-w-2xl text-[13px] text-mute">
        Measured when this page asks: queue counts from BullMQ, timings from your last {metrics.timings.sampleSize} completed jobs in Postgres, and Redis
        stats from <span className="font-mono">INFO</span>. Updated {new Date(metrics.measuredAt).toLocaleTimeString()}.
      </p>

      <div className="grid gap-6 xl:grid-cols-2">
        <section>
          <SectionHead title="Queue" />
          <div className="grid grid-cols-3 border-l border-t border-line">
            <Cell label="waiting" value={metrics.queue.waiting} />
            <Cell label="running" value={metrics.queue.active} />
            <Cell label="delayed / backing off" value={metrics.queue.delayed} />
            <Cell label="done · 1h" value={metrics.throughput.completedLastHour} />
            <Cell label="failed · 1h" value={metrics.throughput.failedLastHour} />
            <Cell label="dead-letter queue" value={metrics.queue.deadLetter} />
            <Cell label="success rate" value={finished ? `${Math.round(((stats?.completed ?? 0) / finished) * 100)}%` : '—'} />
            <Cell label="workers online" value={metrics.workers?.online} />
            <Cell label="kept in redis" value={metrics.queue.completedRetained + metrics.queue.failedRetained} />
          </div>
        </section>

        <section>
          <SectionHead title="Redis" note={metrics.redis.version ? `v${metrics.redis.version}` : undefined} />
          <div className="grid grid-cols-3 border-l border-t border-line">
            <Cell label="round trip" value={ms(metrics.redis.roundTripMs)} />
            <Cell label="commands / s" value={metrics.redis.opsPerSec} />
            <Cell label="memory" value={metrics.redis.usedMemory} />
            <Cell label="clients" value={metrics.redis.connectedClients} />
            <Cell label="eviction" value={metrics.redis.maxMemoryPolicy} />
            <Cell label="aof" value={metrics.redis.aofEnabled === undefined ? undefined : metrics.redis.aofEnabled ? 'on' : 'off'} />
          </div>
        </section>
      </div>

      <section className="mt-8">
        <SectionHead title="Run time by job type" note="queue wait and run time, from completed jobs" />
        <table className="w-full max-w-4xl border-collapse font-mono text-[12.5px]">
          <thead>
            <tr className="border-b border-line text-left">
              {['type', 'runs', 'median', 'p95', 'mean'].map((h) => (
                <th key={h} className="eyebrow px-3 py-2 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(Object.keys(TASK_TYPES) as TaskType[]).map((t) => {
              const timing = metrics.timings.runByType[t];
              return (
                <tr key={t} className="border-b border-line-soft">
                  <td className="px-3 py-2 text-strong">{TASK_TYPES[t].short}</td>
                  <td className="px-3 py-2">{timing.count}</td>
                  <td className="px-3 py-2">{ms(timing.p50Ms)}</td>
                  <td className="px-3 py-2">{ms(timing.p95Ms)}</td>
                  <td className="px-3 py-2">{ms(timing.meanMs)}</td>
                </tr>
              );
            })}
            <tr className="border-b border-line-soft text-mute">
              <td className="px-3 py-2">queue wait</td>
              <td className="px-3 py-2">{metrics.timings.queueWait.count}</td>
              <td className="px-3 py-2">{ms(metrics.timings.queueWait.p50Ms)}</td>
              <td className="px-3 py-2">{ms(metrics.timings.queueWait.p95Ms)}</td>
              <td className="px-3 py-2">{ms(metrics.timings.queueWait.meanMs)}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}

export const VIEW_TITLES = {
  overview: 'Overview',
  jobs: 'Jobs',
  dead: 'Dead letter',
  logs: 'Logs',
  metrics: 'Metrics',
} as const;
export type ViewKey = keyof typeof VIEW_TITLES;

export const isView = (v: string): v is ViewKey => v in VIEW_TITLES;

export function viewClass(active: boolean) {
  return clsx(
    'flex w-full items-center justify-between rounded px-2.5 py-1.5 text-left text-[13px] transition-colors',
    active ? 'bg-raise text-strong' : 'text-mute hover:text-strong'
  );
}
