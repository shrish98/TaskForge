'use client';

import React from 'react';
import { LayoutDashboard, ListTodo, Activity, BarChart3, Settings, ShieldCheck } from 'lucide-react';

interface SidebarProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab = 'dashboard', setActiveTab }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
    { id: 'tasks', label: 'Task Queue', icon: ListTodo, badge: 'Live' },
    { id: 'analytics', label: 'BullMQ Telemetry', icon: Activity, badge: null },
    { id: 'audit', label: 'Task Logs', icon: BarChart3, badge: null },
    { id: 'settings', label: 'System Config', icon: Settings, badge: null },
  ];

  return (
    <aside className="w-64 shrink-0 border-r border-[#e5e3dc] bg-white p-4 hidden md:block min-h-[calc(100vh-4rem)]">
      <div className="space-y-6">
        <div>
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-3">
            Core Platform
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab && setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-[#fff4f0] text-[#f05228] border border-[#fcd5c7] shadow-sm'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-[#f0efe9]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-4 w-4 ${isActive ? 'text-[#f05228]' : 'text-zinc-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700 border border-emerald-300">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Redis & Worker Quick Telemetry Box */}
        <div className="rounded-2xl border border-[#e5e3dc] bg-[#faf9f6] p-3.5 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#18181b]">
            <ShieldCheck className="h-4 w-4 text-[#f05228]" />
            <span>Worker Pool Status</span>
          </div>
          <div className="space-y-1.5 text-[11px] text-zinc-500">
            <div className="flex justify-between">
              <span>BullMQ Queue</span>
              <span className="text-emerald-600 font-medium">Active (5 workers)</span>
            </div>
            <div className="flex justify-between">
              <span>Redis Host</span>
              <span className="text-zinc-700 font-medium">localhost:6379</span>
            </div>
            <div className="flex justify-between">
              <span>PostgreSQL DB</span>
              <span className="text-zinc-700 font-medium">Prisma ORM</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
