'use client';

import React from 'react';
import { Task, TaskStatus, TaskType } from '../../services/task.service';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Search, RotateCcw, Trash2, Eye, Filter, ArrowUpDown, Layers } from 'lucide-react';

interface TaskTableProps {
  tasks: Task[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: TaskStatus | 'ALL';
  onStatusFilterChange: (status: TaskStatus | 'ALL') => void;
  typeFilter: TaskType | 'ALL';
  onTypeFilterChange: (type: TaskType | 'ALL') => void;
  page: number;
  onPageChange: (newPage: number) => void;
  onViewLogs: (task: Task) => void;
  onRetryTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  isLoading?: boolean;
}

export const TaskTable: React.FC<TaskTableProps> = ({
  tasks,
  pagination,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  typeFilter,
  onTypeFilterChange,
  page,
  onPageChange,
  onViewLogs,
  onRetryTask,
  onDeleteTask,
  isLoading = false,
}) => {
  const statusTabs: Array<{ id: TaskStatus | 'ALL'; label: string }> = [
    { id: 'ALL', label: 'All Tasks' },
    { id: 'PENDING', label: 'Pending' },
    { id: 'PROCESSING', label: 'Processing' },
    { id: 'COMPLETED', label: 'Completed' },
    { id: 'FAILED', label: 'Failed' },
  ];

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800/80">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto">
          {statusTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onStatusFilterChange(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                statusFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-slate-800/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Bar & Type Dropdown */}
        <div className="flex items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search title, ID..."
              className="w-full rounded-xl border border-slate-800 bg-slate-950/60 py-2 pl-9 pr-3 text-xs text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Type Dropdown Filter */}
          <select
            value={typeFilter}
            onChange={(e) => onTypeFilterChange(e.target.value as TaskType | 'ALL')}
            className="rounded-xl border border-slate-800 bg-slate-950/60 py-2 px-3 text-xs text-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="ALL">All Types</option>
            <option value="FILE_PROCESSING">File Processing</option>
            <option value="DATA_EXPORT">Data Export</option>
            <option value="REPORT_GENERATION">Report Generation</option>
            <option value="WEB_SCRAPE">Web Scrape</option>
            <option value="NOTIFICATION_DISPATCH">Notification Dispatch</option>
          </select>
        </div>
      </div>

      {/* Task Queue Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-900/40">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold bg-slate-950/50">
              <th className="py-3 px-4">Task Details</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Progress</th>
              <th className="py-3 px-4">Priority</th>
              <th className="py-3 px-4">Created</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  <div className="flex justify-center items-center gap-2">
                    <svg className="h-5 w-5 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Fetching Task Queue...</span>
                  </div>
                </td>
              </tr>
            ) : tasks.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500 italic">
                  No task records found matching your filters.
                </td>
              </tr>
            ) : (
              tasks.map((task) => (
                <tr key={task.id} className="hover:bg-slate-800/40 transition-colors">
                  {/* Title & Type */}
                  <td className="py-3.5 px-4 max-w-xs">
                    <div className="font-semibold text-slate-100 truncate">{task.title}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                      <span>ID: {task.id.slice(0, 8)}...</span>
                      <span>•</span>
                      <span className="text-indigo-400">{task.type}</span>
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className="py-3.5 px-4">
                    <Badge variant={task.status} />
                  </td>

                  {/* Progress Bar */}
                  <td className="py-3.5 px-4 min-w-[140px]">
                    <div className="flex items-center gap-2">
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            task.status === 'COMPLETED'
                              ? 'bg-emerald-500'
                              : task.status === 'FAILED'
                              ? 'bg-rose-500'
                              : 'bg-indigo-500 animate-pulse'
                          }`}
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                      <span className="font-mono text-[11px] text-slate-400 font-semibold">{task.progress}%</span>
                    </div>
                  </td>

                  {/* Priority Tag */}
                  <td className="py-3.5 px-4 font-mono font-medium">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                        task.priority === 3
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : task.priority === 2
                          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      P{task.priority}
                    </span>
                  </td>

                  {/* Created Time */}
                  <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                    {new Date(task.createdAt).toLocaleTimeString()}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* View Logs Button */}
                      <button
                        onClick={() => onViewLogs(task)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                        title="View Logs & Output"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      {/* Retry Button (Only for FAILED tasks) */}
                      {task.status === 'FAILED' && (
                        <button
                          onClick={() => onRetryTask(task.id)}
                          className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-500/20 transition-colors"
                          title="Re-queue Task"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      )}

                      {/* Delete Button */}
                      <button
                        onClick={() => onDeleteTask(task.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete Task"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      <div className="flex items-center justify-between px-2 text-xs text-slate-400">
        <div>
          Showing page <span className="font-bold text-slate-200">{pagination.page}</span> of{' '}
          <span className="font-bold text-slate-200">{pagination.totalPages || 1}</span> ({pagination.total} total items)
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1 || isLoading}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </Button>

          <Button
            variant="secondary"
            size="sm"
            disabled={page >= pagination.totalPages || isLoading}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};
