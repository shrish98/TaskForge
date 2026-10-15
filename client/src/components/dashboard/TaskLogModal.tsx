'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, FileText, Activity, Download } from 'lucide-react';
import { Task, taskService } from '../../services/task.service';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface TaskLogModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TaskLogModal: React.FC<TaskLogModalProps> = ({ task: listTask, isOpen, onClose }) => {
  // The list endpoint doesn't include logs, so load the full task. Socket events invalidate this
  // query, so logs and progress update while the modal is open.
  const { data: detail } = useQuery({
    queryKey: ['task', listTask?.id],
    queryFn: () => taskService.getTaskById(listTask!.id),
    enabled: isOpen && Boolean(listTask?.id),
  });
  const [downloadError, setDownloadError] = useState<string | null>(null);

  if (!isOpen || !listTask) return null;
  const task = detail ?? listTask;
  const artifact = task.result?.artifact as { fileName: string; size: number } | undefined;

  const download = async () => {
    setDownloadError(null);
    try {
      await taskService.downloadArtifact(task.id, artifact?.fileName ?? 'taskforge-file');
    } catch {
      setDownloadError('Download failed. The file may have been replaced by a retry.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
      <div className="w-full max-w-2xl rounded-2xl border border-[#e5e3dc] bg-white p-6 shadow-2xl space-y-5 relative">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#e5e3dc] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fff4f0] text-[#f05228] border border-[#fcd5c7]">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#18181b]">{task.title}</h2>
                <Badge variant={task.status} />
              </div>
              <p className="text-xs text-zinc-500 font-mono mt-0.5">
                ID: {task.id} • Type: {task.type} • Progress: {task.progress}%
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-[#f0efe9] hover:text-zinc-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Task Details Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#faf9f6] p-3 rounded-xl border border-[#e5e3dc] text-xs">
          <div>
            <span className="text-zinc-500 block text-[10px]">Attempts</span>
            <span className="font-semibold text-[#18181b]">{task.attempts} / {task.maxAttempts}</span>
          </div>
          <div>
            <span className="text-zinc-500 block text-[10px]">Priority</span>
            <span className="font-semibold text-[#18181b]">P{task.priority}</span>
          </div>
          <div>
            <span className="text-zinc-500 block text-[10px]">Created At</span>
            <span className="font-mono text-zinc-700">{new Date(task.createdAt).toLocaleTimeString()}</span>
          </div>
          <div>
            <span className="text-zinc-500 block text-[10px]">Completed At</span>
            <span className="font-mono text-zinc-700">
              {task.completedAt ? new Date(task.completedAt).toLocaleTimeString() : '-'}
            </span>
          </div>
        </div>

        {/* Result or Error Message if available */}
        {task.error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            <span className="font-bold">Error Output:</span> {task.error}
          </div>
        )}

        {artifact && task.status === 'COMPLETED' && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-[#e5e3dc] bg-[#faf9f6] p-3 text-xs">
            <div>
              <div className="font-semibold text-[#18181b]">{artifact.fileName}</div>
              <div className="text-zinc-500">{(artifact.size / 1024).toFixed(1)} KB</div>
              {downloadError && <div className="text-rose-600 mt-0.5">{downloadError}</div>}
            </div>
            <Button size="sm" variant="primary" onClick={download}>
              <Download className="h-3.5 w-3.5" /> Download
            </Button>
          </div>
        )}

        {task.result && (
          <div className="space-y-1">
            <span className="text-xs font-semibold text-zinc-700">Execution Result Output:</span>
            <pre className="p-3 rounded-xl bg-[#0c1017] border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-auto max-h-56 whitespace-pre-wrap break-words">
              {JSON.stringify(task.result, null, 2)}
            </pre>
          </div>
        )}

        {/* Audit Logs List */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-[#18181b] flex items-center gap-1.5">
            <Activity className="h-4 w-4 text-[#f05228]" />
            Execution Audit Logs ({task.taskLogs?.length || 0})
          </h3>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {task.taskLogs && task.taskLogs.length > 0 ? (
              task.taskLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start justify-between gap-3 p-2.5 rounded-xl bg-[#faf9f6] border border-[#e5e3dc] text-xs font-mono"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        log.level === 'ERROR'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : log.level === 'WARN'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-[#fff4f0] text-[#f05228] border border-[#fcd5c7]'
                      }`}
                    >
                      {log.level}
                    </span>
                    <span className="text-[#18181b] font-sans">{log.message}</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 shrink-0">
                    {new Date(log.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-zinc-500 italic py-4 text-center">No logs generated for this task yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
