'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Search, Terminal, Filter, RefreshCw, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export const AuditLogsView: React.FC = () => {
  const [filterLevel, setFilterLevel] = useState<'ALL' | 'INFO' | 'WARN' | 'ERROR'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const sampleLogs = [
    {
      id: '1',
      timestamp: '2026-08-01 20:30:12',
      level: 'INFO',
      source: 'WorkerPool',
      message: '⚡ [Worker Process] Initialized BullMQ Task Worker with concurrency = 5',
    },
    {
      id: '2',
      timestamp: '2026-08-01 20:31:05',
      level: 'INFO',
      source: 'TaskService',
      message: '🔄 Processing Job #task_9021 (Type: REPORT_GENERATION, Priority: 3)',
    },
    {
      id: '3',
      timestamp: '2026-08-01 20:31:06',
      level: 'INFO',
      source: 'SocketEngine',
      message: '📊 Broadcasted `job:progress` event over Socket.IO -> Progress: 50%',
    },
    {
      id: '4',
      timestamp: '2026-08-01 20:31:08',
      level: 'INFO',
      source: 'TaskService',
      message: '✅ Job #task_9021 COMPLETED in 2.4s — Result stored in PostgreSQL database',
    },
    {
      id: '5',
      timestamp: '2026-08-01 20:32:15',
      level: 'WARN',
      source: 'WorkerPool',
      message: '⚠️ Task #task_7812 rate limit threshold warning: 85% queue capacity',
    },
    {
      id: '6',
      timestamp: '2026-08-01 20:33:01',
      level: 'ERROR',
      source: 'TaskProcessor',
      message: '❌ Job #task_4412 FAILED: Connection timeout connecting to target host',
    },
  ];

  const filteredLogs = sampleLogs.filter((log) => {
    const matchesLevel = filterLevel === 'ALL' || log.level === filterLevel;
    const matchesSearch =
      !searchTerm ||
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.source.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800/80 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Terminal className="h-4 w-4 text-indigo-400" />
            <span className="text-xs font-semibold text-indigo-400 font-mono">AUDIT TRAIL</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            System & Worker Execution Audit Logs
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Searchable live execution stream, error stack traces, and worker event history.
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800/80">
        <div className="flex items-center gap-2">
          {(['ALL', 'INFO', 'WARN', 'ERROR'] as const).map((level) => (
            <button
              key={level}
              onClick={() => setFilterLevel(level)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filterLevel === level
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800/60'
              }`}
            >
              {level}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search log text..."
            className="w-full rounded-xl border border-slate-800 bg-slate-950/60 py-2 pl-9 pr-3 text-xs text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Log Console Terminal View */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs space-y-3">
        {filteredLogs.map((log) => (
          <div key={log.id} className="flex items-start gap-3 border-b border-slate-900 pb-2.5 last:border-0 last:pb-0">
            <span className="text-slate-500 shrink-0">{log.timestamp}</span>

            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                log.level === 'INFO'
                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                  : log.level === 'WARN'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}
            >
              {log.level}
            </span>

            <span className="text-slate-400 font-semibold shrink-0">[{log.source}]</span>

            <span className="text-slate-200 break-all">{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
