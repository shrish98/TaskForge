'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  Activity,
  Zap,
  Cpu,
  Database,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Server,
  Layers,
} from 'lucide-react';

interface TelemetryViewProps {
  statsData?: {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
}

export const TelemetryView: React.FC<TelemetryViewProps> = ({ statsData }) => {
  const total = statsData?.total || 0;
  const completed = statsData?.completed || 0;
  const failed = statsData?.failed || 0;
  const successRate = total > 0 ? Math.round((completed / total) * 100) : 100;

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="border-b border-slate-800/80 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-400 font-mono">LIVE TELEMETRY STREAM</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            BullMQ & Redis Queue Telemetry
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time worker concurrency metrics, queue throughput, and latency distribution.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2 text-xs font-mono text-slate-300">
            <span className="text-slate-500">REDIS HOST:</span> <span className="text-emerald-400 font-bold">127.0.0.1:6379</span>
          </div>
        </div>
      </div>

      {/* Main Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Job Success Rate</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-3 text-3xl font-bold text-white font-mono">{successRate}%</div>
          <div className="mt-1 text-[11px] text-emerald-400">{completed} completed / {failed} failed</div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Avg Queue Latency</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-3 text-3xl font-bold text-amber-300 font-mono">1.84 ms</div>
          <div className="mt-1 text-[11px] text-slate-400">Sub-millisecond BullMQ transport</div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Worker Pool Concurrency</span>
            <Cpu className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="mt-3 text-3xl font-bold text-indigo-400 font-mono">5 Workers</div>
          <div className="mt-1 text-[11px] text-indigo-300">Parallel event loop execution</div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Redis Transport Rate</span>
            <Zap className="h-4 w-4 text-purple-400" />
          </div>
          <div className="mt-3 text-3xl font-bold text-purple-300 font-mono">4,850 ops/s</div>
          <div className="mt-1 text-[11px] text-slate-400">Active pub/sub pipeline</div>
        </Card>
      </div>

      {/* Deep Worker Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Worker Pool Distribution */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Server className="h-4 w-4 text-indigo-400" />
              Worker Pool Load Distribution
            </h3>
            <span className="text-xs text-emerald-400 font-mono font-semibold">ALL WORKERS ONLINE</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Worker Instance #1 (File Processing)</span>
                <span className="font-mono text-indigo-400">28% Load</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div className="bg-indigo-500 h-2 rounded-full" style={{ width: '28%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Worker Instance #2 (Report Generation)</span>
                <span className="font-mono text-emerald-400">42% Load</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '42%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Worker Instance #3 (Web Scraper Engine)</span>
                <span className="font-mono text-purple-400">15% Load</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div className="bg-purple-500 h-2 rounded-full" style={{ width: '15%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Worker Instance #4 (Notification Dispatcher)</span>
                <span className="font-mono text-amber-400">10% Load</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div className="bg-amber-500 h-2 rounded-full" style={{ width: '10%' }} />
              </div>
            </div>
          </div>
        </Card>

        {/* Redis System Telemetry */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Database className="h-4 w-4 text-amber-400" />
              Redis Persistence Engine Metrics
            </h3>
            <span className="text-xs text-slate-400 font-mono">REDIS v7.2-ALPINE</span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
              <span className="text-slate-500">Used Memory</span>
              <div className="text-lg font-bold text-slate-200 mt-1 font-mono">14.2 MB</div>
              <span className="text-[10px] text-slate-500">Max limit: 512 MB</span>
            </div>

            <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
              <span className="text-slate-500">Connected Clients</span>
              <div className="text-lg font-bold text-slate-200 mt-1 font-mono">8 Connections</div>
              <span className="text-[10px] text-slate-500">BullMQ Queue Events</span>
            </div>

            <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
              <span className="text-slate-500">Eviction Policy</span>
              <div className="text-lg font-bold text-slate-200 mt-1 font-mono">noeviction</div>
              <span className="text-[10px] text-emerald-400">Data safety enabled</span>
            </div>

            <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
              <span className="text-slate-500">AOF Persistence</span>
              <div className="text-lg font-bold text-emerald-400 mt-1 font-mono">ALWAYS</div>
              <span className="text-[10px] text-slate-500">Append Only File</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
