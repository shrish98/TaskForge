'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Settings, ShieldCheck, Cpu, Database, Server, RefreshCw, CheckCircle2 } from 'lucide-react';

export const SystemConfigView: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-[#e5e3dc] pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Settings className="h-4 w-4 text-[#f05228]" />
            <span className="text-xs font-semibold text-[#f05228] font-mono">SYSTEM PARAMETERS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#f05228] tracking-tight">
            Engine & Queue System Configuration
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Configure BullMQ queue settings, worker concurrency, and system environment variables.
          </p>
        </div>
      </div>

      {/* Grid Settings Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Worker Pool Config */}
        <Card className="p-6 space-y-4 border-[#e5e3dc] bg-white">
          <div className="flex items-center gap-3 border-b border-[#e5e3dc] pb-3">
            <Cpu className="h-5 w-5 text-[#f05228]" />
            <h3 className="font-bold text-[#18181b] text-base">Worker Concurrency Settings</h3>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex justify-between items-center bg-[#faf9f6] p-3 rounded-xl border border-[#e5e3dc]">
              <div>
                <div className="font-semibold text-[#18181b]">Max Worker Concurrency</div>
                <div className="text-[11px] text-zinc-500">Parallel job processing threads</div>
              </div>
              <span className="font-mono text-[#f05228] font-bold bg-[#fff4f0] px-3 py-1 rounded-lg border border-[#fcd5c7]">
                5 Threads
              </span>
            </div>

            <div className="flex justify-between items-center bg-[#faf9f6] p-3 rounded-xl border border-[#e5e3dc]">
              <div>
                <div className="font-semibold text-[#18181b]">Retry Strategy</div>
                <div className="text-[11px] text-zinc-500">Exponential backoff algorithm</div>
              </div>
              <span className="font-mono text-emerald-700 font-bold bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
                2x Exponential
              </span>
            </div>

            <div className="flex justify-between items-center bg-[#faf9f6] p-3 rounded-xl border border-[#e5e3dc]">
              <div>
                <div className="font-semibold text-[#18181b]">Max Retry Attempts</div>
                <div className="text-[11px] text-zinc-500">Attempts before marking FAILED</div>
              </div>
              <span className="font-mono text-purple-700 font-bold bg-purple-50 px-3 py-1 rounded-lg border border-purple-200">
                3 Attempts
              </span>
            </div>
          </div>
        </Card>

        {/* Redis & Database Config */}
        <Card className="p-6 space-y-4 border-[#e5e3dc] bg-white">
          <div className="flex items-center gap-3 border-b border-[#e5e3dc] pb-3">
            <Database className="h-5 w-5 text-amber-600" />
            <h3 className="font-bold text-[#18181b] text-base">Infrastructure Environment</h3>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex justify-between items-center bg-[#faf9f6] p-3 rounded-xl border border-[#e5e3dc]">
              <div>
                <div className="font-semibold text-[#18181b]">Redis Host Connection</div>
                <div className="text-[11px] text-zinc-500">BullMQ message broker</div>
              </div>
              <span className="font-mono text-zinc-700 font-bold">localhost:6379</span>
            </div>

            <div className="flex justify-between items-center bg-[#faf9f6] p-3 rounded-xl border border-[#e5e3dc]">
              <div>
                <div className="font-semibold text-[#18181b]">PostgreSQL Database URL</div>
                <div className="text-[11px] text-zinc-500">Prisma ORM data store</div>
              </div>
              <span className="font-mono text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Connected
              </span>
            </div>

            <div className="flex justify-between items-center bg-[#faf9f6] p-3 rounded-xl border border-[#e5e3dc]">
              <div>
                <div className="font-semibold text-[#18181b]">JWT Token Security</div>
                <div className="text-[11px] text-zinc-500">Dual Access & Refresh Token Expiry</div>
              </div>
              <span className="font-mono text-amber-700 font-bold">15m Access / 7d Refresh</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
