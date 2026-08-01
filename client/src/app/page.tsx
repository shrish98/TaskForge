'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { Footer } from '@/components/layout/Footer';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  ListTodo,
  CheckCircle2,
  Clock,
  AlertCircle,
  PlayCircle,
  Plus,
  ArrowUpRight,
  TrendingUp,
  Cpu,
  Layers,
} from 'lucide-react';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const dummyUser = {
    name: 'Demo Architect',
    email: 'user@taskforge.ai',
    role: 'ADMIN',
  };

  const sampleTasks = [
    {
      id: 'task-101',
      title: 'Extract Text & Metadata from Invoice PDF',
      type: 'FILE_PROCESSING',
      status: 'COMPLETED' as const,
      priority: 3,
      progress: 100,
      createdAt: '10 mins ago',
    },
    {
      id: 'task-102',
      title: 'Scrape E-Commerce Competitor Price Catalog',
      type: 'WEB_SCRAPE',
      status: 'PROCESSING' as const,
      priority: 2,
      progress: 65,
      createdAt: '3 mins ago',
    },
    {
      id: 'task-103',
      title: 'Generate Quarterly Financial PDF Report',
      type: 'REPORT_GENERATION',
      status: 'PENDING' as const,
      priority: 1,
      progress: 0,
      createdAt: 'Just now',
    },
    {
      id: 'task-104',
      title: 'Dispatch Batch Email Notifications to Subscribed Clients',
      type: 'NOTIFICATION_DISPATCH',
      status: 'FAILED' as const,
      priority: 2,
      progress: 25,
      createdAt: '1 hour ago',
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#090d16] text-slate-100 selection:bg-indigo-500/30">
      {/* Step 7 Layout - Top Navbar */}
      <Navbar user={dummyUser} />

      <div className="flex flex-1">
        {/* Step 7 Layout - Left Navigation Sidebar */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Main Content Area */}
        <main className="flex-1 p-6 lg:p-8 space-y-8 max-w-7xl mx-auto w-full">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="PROCESSING" pulse>
                  Step 7 Verified
                </Badge>
                <span className="text-xs text-slate-400">• App Router & Design System Ready</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Task Automation & Job Engine
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Real-time job queue metrics, worker concurrency, and live telemetry updates.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="secondary" size="md">
                <Layers className="h-4 w-4" />
                View API Schema
              </Button>
              <Button variant="primary" size="md">
                <Plus className="h-4 w-4" />
                Dispatch New Task
              </Button>
            </div>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <Card className="relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Total Tasks
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <ListTodo className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white">42</span>
                <span className="text-xs font-medium text-emerald-400 flex items-center gap-0.5">
                  <TrendingUp className="h-3 w-3" /> +12% this week
                </span>
              </div>
            </Card>

            <Card className="relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Active Workers
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <PlayCircle className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-indigo-400">1 Jobs</span>
                <span className="text-xs text-slate-400">Concurrency: 5</span>
              </div>
            </Card>

            <Card className="relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Completed
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-emerald-400">38</span>
                <span className="text-xs text-slate-400">90.4% success rate</span>
              </div>
            </Card>

            <Card className="relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Failed Jobs
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <AlertCircle className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-rose-400">3</span>
                <span className="text-xs text-slate-400">Exponential backoff active</span>
              </div>
            </Card>
          </div>

          {/* Live Task Execution Queue Table */}
          <Card>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-indigo-400" />
                  Live Task Queue & Telemetry
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Synchronized with Redis BullMQ Queue & Socket.IO events.
                </p>
              </div>
              <Button variant="ghost" size="sm">
                View All <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="pb-3 px-3">Task Details</th>
                    <th className="pb-3 px-3">Status</th>
                    <th className="pb-3 px-3">Progress</th>
                    <th className="pb-3 px-3">Priority</th>
                    <th className="pb-3 px-3 text-right">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {sampleTasks.map((task) => (
                    <tr key={task.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-4 px-3">
                        <div className="font-semibold text-slate-100">{task.title}</div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          ID: {task.id} • {task.type}
                        </div>
                      </td>
                      <td className="py-4 px-3">
                        <Badge variant={task.status} />
                      </td>
                      <td className="py-4 px-3 min-w-[140px]">
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
                          <span className="font-mono text-[11px] text-slate-400 font-semibold">
                            {task.progress}%
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-3 font-mono font-medium">
                        <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-300">
                          P{task.priority}
                        </span>
                      </td>
                      <td className="py-4 px-3 text-right text-slate-400 font-mono text-[11px]">
                        {task.createdAt}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </main>
      </div>

      {/* Step 7 Layout - Bottom Status Footer */}
      <Footer />
    </div>
  );
}
