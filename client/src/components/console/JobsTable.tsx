'use client';

import React from 'react';
import clsx from 'clsx';
import { Task } from '@/services/task.service';
import { ago, bytes, ms } from '@/lib/format';
import { AttemptDots, Empty, phaseOf, ProgressBar, StatusTag, TypeTag } from './bits';

/** The last column says the most useful thing for the job's state. */
function Detail({ task }: { task: Task }) {
  const phase = phaseOf(task);
  if (phase === 'running' || phase === 'retrying') {
    return (
      <span className="flex items-center gap-2">
        <ProgressBar value={task.progress} />
        <span className="font-mono text-[12px] text-ink">{task.progress}%</span>
      </span>
    );
  }
  if (phase === 'scheduled') return <span className="font-mono text-[12px] text-sky">runs {new Date(task.scheduledAt!).toLocaleTimeString()}</span>;
  if (phase === 'dead') {
    return <span className="block max-w-[260px] truncate font-mono text-[12px] text-bad/90">{task.error ?? 'failed'}</span>;
  }
  if (phase === 'done') {
    const artifact = task.result?.artifact as { size: number } | undefined;
    const run = task.startedAt && task.completedAt ? new Date(task.completedAt).getTime() - new Date(task.startedAt).getTime() : null;
    return (
      <span className="font-mono text-[12px] text-mute">
        {ms(run)}
        {artifact && ` · ${bytes(artifact.size)}`}
      </span>
    );
  }
  return <span className="font-mono text-[12px] text-faint">—</span>;
}

export function JobsTable({
  tasks,
  selectedId,
  onOpen,
  showOwner,
  compact,
  loading,
}: {
  tasks: Task[];
  selectedId?: string | null;
  onOpen: (task: Task) => void;
  showOwner?: boolean;
  compact?: boolean;
  loading?: boolean;
}) {
  if (!loading && tasks.length === 0) return <Empty>No jobs match. Queue one with “New job”.</Empty>;

  return (
    <table className="w-full border-collapse text-[13px]">
      <thead>
        <tr className="border-b border-line text-left">
          <th className="eyebrow px-3 py-2 font-medium">Job</th>
          <th className="eyebrow px-3 py-2 font-medium">Type</th>
          <th className="eyebrow px-3 py-2 font-medium">Status</th>
          <th className="eyebrow px-3 py-2 font-medium">Tries</th>
          <th className="eyebrow px-3 py-2 font-medium">{compact ? 'Detail' : 'Progress / result'}</th>
          {!compact && <th className="eyebrow px-3 py-2 text-right font-medium">Created</th>}
        </tr>
      </thead>
      <tbody>
        {loading && tasks.length === 0
          ? Array.from({ length: 5 }, (_, i) => (
              <tr key={i} className="border-b border-line-soft">
                <td colSpan={compact ? 5 : 6} className="px-3 py-3">
                  <span className="block h-3 w-1/2 animate-pulse rounded-sm bg-line" />
                </td>
              </tr>
            ))
          : tasks.map((task) => (
              <tr
                key={task.id}
                onClick={() => onOpen(task)}
                className={clsx(
                  'cursor-pointer border-b border-line-soft transition-colors hover:bg-raise/60',
                  selectedId === task.id && 'bg-raise'
                )}
              >
                <td className="max-w-[320px] px-3 py-2.5">
                  <span className="block truncate text-strong">{task.title}</span>
                  {showOwner && task.user && <span className="block truncate font-mono text-[11px] text-faint">{task.user.email}</span>}
                </td>
                <td className="px-3 py-2.5">
                  <TypeTag type={task.type} />
                </td>
                <td className="px-3 py-2.5">
                  <StatusTag phase={phaseOf(task)} />
                </td>
                <td className="px-3 py-2.5">
                  <AttemptDots task={task} />
                </td>
                <td className="px-3 py-2.5">
                  <Detail task={task} />
                </td>
                {!compact && <td className="px-3 py-2.5 text-right font-mono text-[12px] text-faint">{ago(task.createdAt)}</td>}
              </tr>
            ))}
      </tbody>
    </table>
  );
}
