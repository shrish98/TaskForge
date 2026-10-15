'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LogOut, Plus } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { logoutUser } from '@/store/slices/authSlice';
import { useSocket } from '@/hooks/useSocket';
import { taskService } from '@/services/task.service';
import { ms } from '@/lib/format';
import { Mark } from '@/components/brand/Mark';
import { LiveDot } from './bits';
import { JobDrawer } from './JobDrawer';
import { NewJobDrawer } from './NewJobDrawer';
import { isView, JobsView, LogsView, MetricsView, OverviewView, VIEW_TITLES, viewClass, ViewKey } from './views';

const NAV: Array<{ group: string; items: ViewKey[] }> = [
  { group: 'Queue', items: ['overview', 'jobs', 'dead', 'logs'] },
  { group: 'System', items: ['metrics'] },
];

export function Console() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAppSelector((s) => s.auth);
  const isAdmin = user?.role === 'ADMIN';
  const { isConnected } = useSocket();

  // The view lives in the URL hash, so reloads and the back button keep your place.
  const [view, setView] = useState<ViewKey>('overview');
  useEffect(() => {
    const read = () => {
      const hash = window.location.hash.slice(1);
      setView(isView(hash) ? hash : 'overview');
    };
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);
  const go = (next: ViewKey) => {
    window.location.hash = next;
    setView(next);
  };

  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const closeDrawer = useCallback(() => setOpenId(null), []);
  const closeNew = useCallback(() => setCreating(false), []);

  const poll = isConnected ? false : 5000;
  const { data: metrics } = useQuery({ queryKey: ['systemMetrics'], queryFn: () => taskService.getSystemMetrics(), refetchInterval: 10_000 });
  const { data: stats } = useQuery({ queryKey: ['taskStats', user?.id], queryFn: () => taskService.getStatsSummary(), refetchInterval: poll });

  const counts: Partial<Record<ViewKey, number | undefined>> = { jobs: stats?.total, dead: stats?.failed };
  const props = { onOpen: setOpenId, selectedId: openId, isAdmin, live: isConnected };

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[220px_1fr]">
      <aside className="hidden flex-col gap-6 border-r border-line px-3.5 py-4 lg:flex">
        <div className="flex items-center gap-2.5 px-1 text-[15px] font-semibold tracking-[-0.01em] text-strong">
          <Mark /> TaskForge
        </div>
        {NAV.map((section) => (
          <nav key={section.group}>
            <p className="eyebrow mb-1.5 px-2.5">{section.group}</p>
            {section.items.map((key) => (
              <button key={key} type="button" onClick={() => go(key)} className={viewClass(view === key)} aria-current={view === key ? 'page' : undefined}>
                {VIEW_TITLES[key]}
                {counts[key] !== undefined && (
                  <span className={key === 'dead' && counts[key] ? 'font-mono text-[11px] text-bad' : 'font-mono text-[11px] text-faint'}>
                    {counts[key]}
                  </span>
                )}
              </button>
            ))}
          </nav>
        ))}
        <div className="mt-auto space-y-3 px-1 font-mono text-[11.5px] leading-relaxed text-faint">
          <p>
            redis {metrics?.redis.version ?? '…'} · {ms(metrics?.redis.roundTripMs)} rtt
            <br />
            {metrics?.workers ? `${metrics.workers.online} worker${metrics.workers.online === 1 ? '' : 's'} online` : 'workers: n/a'}
          </p>
          <div className="flex items-center gap-2 border-t border-line pt-3">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-mute">{user?.email}</span>
              {isAdmin && <span className="text-amber">admin · sees every user</span>}
            </span>
            <button type="button" onClick={async () => {
                await dispatch(logoutUser());
                queryClient.clear();
                router.push('/login');
              }} className="rounded p-1 text-faint hover:bg-raise hover:text-strong" title="Sign out" aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="min-w-0">
        <div className="flex items-center gap-4 border-b border-line px-6 py-3.5">
          <span className="flex items-center gap-2 lg:hidden"><Mark /></span>
          <h1 className="text-[15px] font-semibold text-strong">{VIEW_TITLES[view]}</h1>
          <LiveDot on={isConnected} />
          <button type="button" className="btn btn-primary ml-auto" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> New job
          </button>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-b border-line px-4 py-2 lg:hidden">
          {(Object.keys(VIEW_TITLES) as ViewKey[]).map((key) => (
            <button key={key} type="button" className="tab shrink-0" aria-pressed={view === key} onClick={() => go(key)}>
              {VIEW_TITLES[key].toLowerCase()}
            </button>
          ))}
        </nav>

        {view === 'overview' && <OverviewView {...props} metrics={metrics} stats={stats} />}
        {view === 'jobs' && <JobsView key="jobs" {...props} />}
        {view === 'dead' && <JobsView key="dead" {...props} initialStatus="FAILED" />}
        {view === 'logs' && <LogsView {...props} />}
        {view === 'metrics' && <MetricsView metrics={metrics} stats={stats} />}
      </main>

      <JobDrawer taskId={openId} onClose={closeDrawer} />
      <NewJobDrawer
        open={creating}
        onClose={closeNew}
        onCreated={(id) => {
          setCreating(false);
          setOpenId(id);
        }}
      />
    </div>
  );
}
