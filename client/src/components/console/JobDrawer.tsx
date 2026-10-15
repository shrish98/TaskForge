'use client';

import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, RotateCcw, Trash2, X } from 'lucide-react';
import { taskService, TASK_TYPES } from '@/services/task.service';
import { bytes, clock, ms } from '@/lib/format';
import { AttemptDots, phaseOf, ProgressBar, StatusTag } from './bits';

const LEVEL_STYLE = { INFO: 'text-ink', WARN: 'text-amber', ERROR: 'text-bad' } as const;

export function JobDrawer({ taskId, onClose }: { taskId: string | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: task, isLoading } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => taskService.getTaskById(taskId!),
    enabled: Boolean(taskId),
  });
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    queryClient.invalidateQueries({ queryKey: ['taskStats'] });
    queryClient.invalidateQueries({ queryKey: ['task', taskId] });
  };
  const retry = useMutation({ mutationFn: () => taskService.retryTask(taskId!), onSuccess: refresh });
  const remove = useMutation({
    mutationFn: () => taskService.deleteTask(taskId!),
    onSuccess: () => {
      refresh();
      onClose();
    },
  });

  useEffect(() => {
    if (!taskId) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [taskId, onClose]);

  if (!taskId) return null;
  const phase = task ? phaseOf(task) : null;
  const artifact = task?.result?.artifact as { fileName: string; size: number } | undefined;
  const logs = [...(task?.taskLogs ?? [])].reverse();

  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true" aria-label="Job details">
      <button type="button" className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="Close" />
      <aside className="relative flex h-full w-full max-w-[560px] animate-slide-in flex-col border-l border-line bg-panel">
        <header className="flex items-start gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[11.5px] text-faint">
              {task ? `${TASK_TYPES[task.type].short} · ${task.id}` : '…'}
            </p>
            <h2 className="mt-1 truncate text-[16px] font-semibold text-strong">{task?.title ?? 'Loading…'}</h2>
            {task && (
              <div className="mt-2 flex items-center gap-4">
                <StatusTag phase={phase!} />
                <AttemptDots task={task} />
                <span className="font-mono text-[12px] text-faint">P{task.priority}</span>
                {(phase === 'running' || phase === 'retrying') && <ProgressBar value={task.progress} className="w-28" />}
              </div>
            )}
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 text-mute hover:bg-raise hover:text-strong" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          {isLoading && <p className="px-5 py-6 font-mono text-[12px] text-faint">loading…</p>}

          {task && (
            <>
              {task.error && phase === 'dead' && (
                <div className="border-b border-line bg-bad-soft px-5 py-3 font-mono text-[12px] text-bad">{task.error}</div>
              )}

              <section className="border-b border-line px-5 py-4">
                <p className="eyebrow mb-3">Attempts</p>
                {task.runs && task.runs.length > 0 ? (
                  <ol className="space-y-2">
                    {task.runs.map((run) => {
                      const dur = run.endedAt ? new Date(run.endedAt).getTime() - new Date(run.startedAt).getTime() : null;
                      return (
                        <li key={run.id} className="grid grid-cols-[22px_1fr_auto] items-baseline gap-2 font-mono text-[12px]">
                          <span className="text-faint">#{run.number}</span>
                          <span className="min-w-0">
                            <span
                              className={clsx(
                                run.outcome === 'COMPLETED' && 'text-ok',
                                run.outcome === 'FAILED' && 'text-bad',
                                run.outcome === 'RUNNING' && 'text-amber',
                                run.outcome === 'ABANDONED' && 'text-mute'
                              )}
                            >
                              {run.outcome.toLowerCase()}
                            </span>
                            {run.error && <span className="ml-2 break-words text-mute">{run.error}</span>}
                            <span className="block text-[11px] text-faint">{run.worker}</span>
                          </span>
                          <span className="text-right text-mute">
                            {clock(run.startedAt)}
                            <span className="block text-[11px] text-faint">{dur === null ? 'running' : ms(dur)}</span>
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <p className="font-mono text-[12px] text-faint">Not started yet.</p>
                )}
              </section>

              {artifact && phase === 'done' && (
                <section className="flex items-center gap-3 border-b border-line px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-[12.5px] text-strong">{artifact.fileName}</p>
                    <p className="font-mono text-[11.5px] text-faint">{bytes(artifact.size)}</p>
                    {downloadError && <p className="mt-1 text-[12px] text-bad">{downloadError}</p>}
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={async () => {
                      setDownloadError(null);
                      try {
                        await taskService.downloadArtifact(task.id, artifact.fileName);
                      } catch {
                        setDownloadError('Download failed. A retry may have replaced the file.');
                      }
                    }}
                  >
                    <Download className="h-3.5 w-3.5" /> Download
                  </button>
                </section>
              )}

              {task.result && (
                <section className="border-b border-line px-5 py-4">
                  <p className="eyebrow mb-2">Result</p>
                  <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded border border-line bg-bg p-3 font-mono text-[11.5px] leading-relaxed text-ink">
                    {JSON.stringify(task.result, null, 2)}
                  </pre>
                </section>
              )}

              <section className="border-b border-line px-5 py-4">
                <p className="eyebrow mb-2">Payload</p>
                <pre className="overflow-auto whitespace-pre-wrap break-words font-mono text-[11.5px] text-mute">
                  {JSON.stringify(task.payload ?? {}, null, 2)}
                </pre>
              </section>

              <section className="px-5 py-4">
                <p className="eyebrow mb-2">Log</p>
                <ol className="font-mono text-[12px] leading-[1.8]">
                  {logs.map((log) => (
                    <li key={log.id} className="grid grid-cols-[94px_1fr] gap-2">
                      <span className="text-faint">{clock(log.createdAt)}</span>
                      <span className={clsx('break-words', LEVEL_STYLE[log.level])}>{log.message}</span>
                    </li>
                  ))}
                </ol>
              </section>
            </>
          )}
        </div>

        {task && (
          <footer className="flex items-center gap-2 border-t border-line px-5 py-3">
            {phase === 'dead' && (
              <button type="button" className="btn btn-primary" disabled={retry.isPending} onClick={() => retry.mutate()}>
                <RotateCcw className="h-3.5 w-3.5" /> {retry.isPending ? 'Requeuing…' : 'Retry with fresh attempts'}
              </button>
            )}
            <button
              type="button"
              className="btn btn-danger ml-auto"
              disabled={remove.isPending || phase === 'running' || phase === 'retrying'}
              title={phase === 'running' || phase === 'retrying' ? 'A running job can’t be deleted' : undefined}
              onClick={() => confirm('Delete this job and its logs?') && remove.mutate()}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </footer>
        )}
      </aside>
    </div>
  );
}
