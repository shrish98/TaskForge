'use client';

import React, { useState } from 'react';
import { X, Plus, Calendar, Layers, AlertCircle } from 'lucide-react';
import { CreateTaskPayload, TaskType } from '../../services/task.service';
import { Button } from '../ui/Button';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateTaskPayload) => Promise<void>;
  isLoading?: boolean;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<TaskType>('FILE_PROCESSING');
  const [priority, setPriority] = useState<number>(1);
  const [scheduledAt, setScheduledAt] = useState('');
  const [payloadJson, setPayloadJson] = useState('{\n  "source": "api_upload"\n}');
  const [jsonError, setJsonError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setJsonError(null);

    let parsedPayload = {};
    if (payloadJson.trim()) {
      try {
        parsedPayload = JSON.parse(payloadJson);
      } catch (err: any) {
        setJsonError('Invalid JSON payload format');
        return;
      }
    }

    const taskPayload: CreateTaskPayload = {
      title,
      description: description || undefined,
      type,
      priority,
      payload: Object.keys(parsedPayload).length > 0 ? parsedPayload : undefined,
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
    };

    await onSubmit(taskPayload);
    // Reset form
    setTitle('');
    setDescription('');
    setType('FILE_PROCESSING');
    setPriority(1);
    setScheduledAt('');
    setPayloadJson('{\n  "source": "api_upload"\n}');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-5 relative">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Create Asynchronous Task</h2>
              <p className="text-xs text-slate-400">Queue job for BullMQ worker processing</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300">Task Title *</label>
            <input
              type="text"
              required
              minLength={3}
              maxLength={150}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Process Customer Invoice Batch #992"
              className="w-full rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300">Description (Optional)</label>
            <textarea
              rows={2}
              maxLength={1000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide context or operational instructions..."
              className="w-full rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Type & Priority Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Task Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as TaskType)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="FILE_PROCESSING">File Processing</option>
                <option value="DATA_EXPORT">Data Export</option>
                <option value="REPORT_GENERATION">Report Generation</option>
                <option value="WEB_SCRAPE">Web Scrape</option>
                <option value="NOTIFICATION_DISPATCH">Notification Dispatch</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value, 10))}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value={1}>P1 - Normal Priority</option>
                <option value={2}>P2 - High Priority</option>
                <option value={3}>P3 - Critical Priority</option>
              </select>
            </div>
          </div>

          {/* Scheduled Datetime (Optional) */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-indigo-400" />
              Schedule Execution (Optional)
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <p className="text-[10px] text-slate-500">Leave blank to queue for immediate worker execution.</p>
          </div>

          {/* Payload JSON Editor */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-indigo-400" />
                Payload JSON (Optional)
              </label>
              {jsonError && (
                <span className="text-[10px] font-semibold text-rose-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {jsonError}
                </span>
              )}
            </div>
            <textarea
              rows={3}
              value={payloadJson}
              onChange={(e) => {
                setPayloadJson(e.target.value);
                setJsonError(null);
              }}
              className="w-full font-mono text-[11px] rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 text-indigo-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isLoading}>
              Dispatch Task
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
