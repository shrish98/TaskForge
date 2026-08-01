'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Settings, ShieldCheck, Cpu, Database, Server, RefreshCw, CheckCircle2 } from 'lucide-react';

export const SystemConfigView: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-800/80 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Settings className="h-4 w-4 text-indigo-400" />
            <span className="text-xs font-semibold text-indigo-400 font-mono">SYSTEM PARAMETERS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Engine & Queue System Configuration
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Configure BullMQ queue settings, worker concurrency, and system environment variables.
          </p>
        </div>
      </div>

      {/* Grid Settings Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Worker Pool Config */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
            <Cpu className="h-5 w-5 text-indigo-400" />
            <h3 className="font-bold text-white text-base">Worker Concurrency Settings</h3>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex justify-between items-center bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <div>
                <div className="font-semibold text-slate-200">Max Worker Concurrency</div>
                <div className="text-[11px] text-slate-400">Parallel job processing threads</div>
              </div>
              <span className="font-mono text-indigo-400 font-bold bg-indigo-500/10 px-3 py-1 rounded-lg border border-indigo-500/20">
                5 Threads
              </span>
            </div>

            <div className="flex justify-between items-center bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <div>
                <div className="font-semibold text-slate-200">Retry Strategy</div>
                <div className="text-[11px] text-slate-400">Exponential backoff algorithm</div>
              </div>
              <span className="font-mono text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">
                2x Exponential
              </span>
            </div>

            <div className="flex justify-between items-center bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <div>
                <div className="font-semibold text-slate-200">Max Retry Attempts</div>
                <div className="text-[11px] text-slate-400">Attempts before marking FAILED</div>
              </div>
              <span className="font-mono text-purple-400 font-bold bg-purple-500/10 px-3 py-1 rounded-lg border border-purple-500/20">
                3 Attempts
              </span>
            </div>
          </div>
        </Card>

        {/* Redis & Database Config */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
            <Database className="h-5 w-5 text-amber-400" />
            <h3 className="font-bold text-white text-base">Infrastructure Environment</h3>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex justify-between items-center bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <div>
                <div className="font-semibold text-slate-200">Redis Host Connection</div>
                <div className="text-[11px] text-slate-400">BullMQ message broker</div>
              </div>
              <span className="font-mono text-slate-300 font-bold">localhost:6379</span>
            </div>

            <div className="flex justify-between items-center bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <div>
                <div className="font-semibold text-slate-200">PostgreSQL Database URL</div>
                <div className="text-[11px] text-slate-400">Prisma ORM data store</div>
              </div>
              <span className="font-mono text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Connected
              </span>
            </div>

            <div className="flex justify-between items-center bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <div>
                <div className="font-semibold text-slate-200">JWT Token Security</div>
                <div className="text-[11px] text-slate-400">Dual Access & Refresh Token Expiry</div>
              </div>
              <span className="font-mono text-amber-300 font-bold">15m Access / 7d Refresh</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
