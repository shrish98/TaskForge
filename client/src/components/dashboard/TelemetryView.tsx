'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { CheckCircle2, Clock, Cpu, Database, Inbox, Server, Timer } from 'lucide-react';
import { taskService, TaskType, TASK_TYPES } from '@/services/task.service';

interface TelemetryViewProps {
  statsData?: {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
}

const ms = (value: number | null | undefined) =>
  value === null || value === undefined ? '–' : value < 1000 ? `${Math.round(value)} ms` : `${(value / 1000).toFixed(1)} s`;

function Stat({ label, value, note, icon }: { label: string; value: React.ReactNode; note?: React.ReactNode; icon: React.ReactNode }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>{label}</span>
        {icon}
      </div>
      <div className="mt-3 text-3xl font-bold text-[#18181b] font-mono">{value}</div>
      {note && <div className="mt-1 text-[11px] text-zinc-500">{note}</div>}
    </Card>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#e5e3dc] bg-[#faf9f6] p-3">
      <span className="text-zinc-500">{label}</span>
      <div className="text-lg font-bold text-[#18181b] mt-1 font-mono">{value ?? 'unavailable'}</div>
    </div>
  );
}

// Every number here is measured by GET /system/metrics when the page asks for it.
export const TelemetryView: React.FC<TelemetryViewProps> = ({ statsData }) => {
  const { data: m, isLoading, isError } = useQuery({
    queryKey: ['systemMetrics'],
    queryFn: () => taskService.getSystemMetrics(),
    refetchInterval: 5000,
  });

  const total = statsData?.total || 0;
  const completed = statsData?.completed || 0;
  const failed = statsData?.failed || 0;
  const finished = completed + failed;
  const successRate = finished > 0 ? Math.round((completed / finished) * 100) : null;

  return (
    <div className="space-y-8">
      <div className="border-b border-[#e5e3dc] pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#f05228] tracking-tight">Queue telemetry</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Live from BullMQ, Redis and Postgres. Timings come from your last {m?.timings.sampleSize ?? '…'} completed tasks.
          </p>
        </div>
        <div className="text-xs font-mono text-zinc-500">
          {isError ? 'Could not load metrics' : m ? `Measured ${new Date(m.measuredAt).toLocaleTimeString()}` : 'Loading…'}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          label="Success rate"
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
          value={successRate === null ? '–' : `${successRate}%`}
          note={`${completed} completed / ${failed} failed of ${total}`}
        />
        <Stat
          label="Queue wait (p50 / p95)"
          icon={<Clock className="h-4 w-4 text-amber-600" />}
          value={ms(m?.timings.queueWait.p50Ms)}
          note={`p95 ${ms(m?.timings.queueWait.p95Ms)}: time from due to picked up`}
        />
        <Stat
          label="Run time (p50 / p95)"
          icon={<Timer className="h-4 w-4 text-[#f05228]" />}
          value={ms(m?.timings.run.p50Ms)}
          note={`p95 ${ms(m?.timings.run.p95Ms)} across all job types`}
        />
        <Stat
          label="Workers online"
          icon={<Cpu className="h-4 w-4 text-[#f05228]" />}
          value={m?.workers ? m.workers.online : '–'}
          note={m?.workers ? 'Connected to the queue right now' : 'Redis host hides client list'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#e5e3dc] pb-3">
            <h3 className="font-bold text-[#18181b] text-sm flex items-center gap-2">
              <Inbox className="h-4 w-4 text-[#f05228]" />
              Queue right now
            </h3>
            <span className="text-xs text-zinc-500 font-mono">
              {m ? `${m.throughput.completedLastHour} done in the last hour` : ''}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <Row label="Waiting" value={m?.queue.waiting} />
            <Row label="Running" value={m?.queue.active} />
            <Row label="Scheduled / backing off" value={m?.queue.delayed} />
            <Row label="Failed (last hour)" value={m?.throughput.failedLastHour} />
            <Row label="Dead-letter queue" value={m?.queue.deadLetter} />
            <Row label="Kept in Redis" value={m ? m.queue.completedRetained + m.queue.failedRetained : undefined} />
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#e5e3dc] pb-3">
            <h3 className="font-bold text-[#18181b] text-sm flex items-center gap-2">
              <Database className="h-4 w-4 text-amber-600" />
              Redis
            </h3>
            <span className="text-xs text-zinc-500 font-mono">{m?.redis.version ? `v${m.redis.version}` : ''}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <Row label="Round trip from API" value={m ? ms(m.redis.roundTripMs) : undefined} />
            <Row label="Commands / sec" value={m?.redis.opsPerSec} />
            <Row label="Memory used" value={m?.redis.usedMemory} />
            <Row label="Connected clients" value={m?.redis.connectedClients} />
          </div>
        </Card>
      </div>

      <Card className="p-6 space-y-4">
        <h3 className="font-bold text-[#18181b] text-sm flex items-center gap-2 border-b border-[#e5e3dc] pb-3">
          <Server className="h-4 w-4 text-[#f05228]" />
          Run time by job type
        </h3>
        {isLoading ? (
          <p className="text-xs text-zinc-500">Loading…</p>
        ) : (
          <table className="w-full text-xs">
            <thead className="text-left text-zinc-500">
              <tr>
                <th className="py-1.5 font-medium">Job</th>
                <th className="py-1.5 font-medium">Runs</th>
                <th className="py-1.5 font-medium">Median</th>
                <th className="py-1.5 font-medium">p95</th>
              </tr>
            </thead>
            <tbody className="font-mono text-[#18181b]">
              {(Object.keys(TASK_TYPES) as TaskType[]).map((type) => {
                const t = m?.timings.runByType[type];
                return (
                  <tr key={type} className="border-t border-[#f0efe9]">
                    <td className="py-2 font-sans">{TASK_TYPES[type].label}</td>
                    <td className="py-2">{t?.count ?? 0}</td>
                    <td className="py-2">{ms(t?.p50Ms)}</td>
                    <td className="py-2">{ms(t?.p95Ms)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
};
