'use client';

import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { taskService, TaskType, TASK_TYPES } from '@/services/task.service';

const pretty = (type: TaskType) => JSON.stringify(TASK_TYPES[type].example, null, 2);
const PRIORITIES = [
  { value: 1, label: 'P1 normal' },
  { value: 2, label: 'P2 high' },
  { value: 3, label: 'P3 urgent' },
];

export function NewJobDrawer({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const queryClient = useQueryClient();
  const [type, setType] = useState<TaskType>('FILE_PROCESSING');
  const [title, setTitle] = useState('');
  const [payload, setPayload] = useState(pretty('FILE_PROCESSING'));
  const [priority, setPriority] = useState(1);
  const [scheduledAt, setScheduledAt] = useState('');
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: (body: Parameters<typeof taskService.createTask>[0]) => taskService.createTask(body),
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['taskStats'] });
      setTitle('');
      onCreated(task.id);
    },
    onError: (err: any) => {
      // The API checks the payload against the job type; show the field it rejected.
      const first = err.response?.data?.errors?.[0];
      setError(first ? `${first.field}: ${first.message}` : err.response?.data?.message ?? 'Could not queue the job');
    },
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const pickType = (next: TaskType) => {
    setType(next);
    setPayload(pretty(next));
    setError(null);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    let parsed: Record<string, unknown>;
    try {
      parsed = payload.trim() ? JSON.parse(payload) : {};
    } catch {
      setError('Payload is not valid JSON');
      return;
    }
    create.mutate({
      title: title.trim() || `${TASK_TYPES[type].label} job`,
      type,
      priority,
      payload: parsed,
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true" aria-label="New job">
      <button type="button" className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="Close" />
      <form onSubmit={submit} className="relative flex h-full w-full max-w-[520px] animate-slide-in flex-col border-l border-line bg-panel">
        <header className="flex items-center border-b border-line px-5 py-4">
          <h2 className="text-[15px] font-semibold text-strong">New job</h2>
          <button type="button" onClick={onClose} className="ml-auto rounded p-1 text-mute hover:bg-raise hover:text-strong" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <fieldset>
            <legend className="eyebrow mb-2">Type</legend>
            <div className="divide-y divide-line-soft border border-line">
              {(Object.keys(TASK_TYPES) as TaskType[]).map((t) => (
                <label
                  key={t}
                  className={clsx(
                    'flex cursor-pointer items-start gap-3 px-3 py-2.5 transition-colors',
                    type === t ? 'bg-raise' : 'hover:bg-raise/50'
                  )}
                >
                  <input type="radio" name="type" checked={type === t} onChange={() => pickType(t)} className="mt-1 accent-[#f5a524]" />
                  <span>
                    <span className="flex items-baseline gap-2">
                      <span className="text-[13px] font-medium text-strong">{TASK_TYPES[t].label}</span>
                      <span className="font-mono text-[11px] text-faint">{t}</span>
                    </span>
                    <span className="mt-0.5 block text-[12.5px] text-mute">{TASK_TYPES[t].summary}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block">
            <span className="eyebrow mb-1.5 block">Title</span>
            <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} placeholder={`${TASK_TYPES[type].label} job`} />
          </label>

          <label className="block">
            <span className="eyebrow mb-1.5 block">Payload</span>
            <textarea
              value={payload}
              onChange={(e) => {
                setPayload(e.target.value);
                setError(null);
              }}
              rows={6}
              spellCheck={false}
              className="w-full resize-y rounded border border-line bg-bg p-2.5 font-mono text-[12px] leading-relaxed text-strong focus:border-amber focus:outline-none"
            />
            <span className="mt-1 block text-[12px] text-faint">Pre-filled with a payload that works. The API validates it against the type.</span>
          </label>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="eyebrow mb-1.5 block">Priority</span>
              <div className="flex border border-line">
                {PRIORITIES.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    aria-pressed={priority === p.value}
                    onClick={() => setPriority(p.value)}
                    className={clsx(
                      'flex-1 border-r border-line py-1.5 font-mono text-[11.5px] last:border-r-0',
                      priority === p.value ? 'bg-raise text-strong' : 'text-mute hover:text-strong'
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <label className="block">
              <span className="eyebrow mb-1.5 block">Run at (optional)</span>
              <input type="datetime-local" className="field [color-scheme:dark]" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
            </label>
          </div>
        </div>

        <footer className="border-t border-line px-5 py-3">
          {error && <p className="mb-2 font-mono text-[12px] text-bad">{error}</p>}
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11.5px] text-faint">3 attempts · backoff 2s, 4s</span>
            <button type="button" className="btn btn-ghost ml-auto" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={create.isPending}>
              {create.isPending ? 'Queuing…' : 'Queue job'}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}
