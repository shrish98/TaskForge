'use client';

import React from 'react';
import { X, FileText, Activity } from 'lucide-react';
import { Task } from '../../services/task.service';
import { Badge } from '../ui/Badge';

interface TaskLogModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TaskLogModal: React.FC<TaskLogModalProps> = ({ task, isOpen, onClose }) => {
  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-5 relative">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">{task.title}</h2>
                <Badge variant={task.status} />
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                ID: {task.id} • Type: {task.type} • Progress: {task.progress}%
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Task Details Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/50 p-3 rounded-xl border border-slate-800/80 text-xs">
          <div>
            <span className="text-slate-500 block text-[10px]">Attempts</span>
            <span className="font-semibold text-slate-200">{task.attempts} / {task.maxAttempts}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">Priority</span>
            <span className="font-semibold text-slate-200">P{task.priority}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">Created At</span>
            <span className="font-mono text-slate-300">{new Date(task.createdAt).toLocaleTimeString()}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">Completed At</span>
            <span className="font-mono text-slate-300">
              {task.completedAt ? new Date(task.completedAt).toLocaleTimeString() : '-'}
            </span>
          </div>
        </div>

        {/* Result or Error Message if available */}
        {task.error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            <span className="font-bold">Error Output:</span> {task.error}
          </div>
        )}

        {task.result && (
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-300">Execution Result Output:</span>
            <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-32">
              {JSON.stringify(task.result, null, 2)}
            </pre>
          </div>
        )}

        {/* Audit Logs List */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Activity className="h-4 w-4 text-indigo-400" />
            Execution Audit Logs ({task.taskLogs?.length || 0})
          </h3>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {task.taskLogs && task.taskLogs.length > 0 ? (
              task.taskLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start justify-between gap-3 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60 text-xs font-mono"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        log.level === 'ERROR'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : log.level === 'WARN'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                      }`}
                    >
                      {log.level}
                    </span>
                    <span className="text-slate-300 font-sans">{log.message}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 shrink-0">
                    {new Date(log.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 italic py-4 text-center">No logs generated for this task yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
