'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { Footer } from '@/components/layout/Footer';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CreateTaskModal } from '@/components/dashboard/CreateTaskModal';
import { TaskLogModal } from '@/components/dashboard/TaskLogModal';
import { TaskTable } from '@/components/dashboard/TaskTable';
import { useSocket } from '@/hooks/useSocket';
import {
  taskService,
  Task,
  TaskStatus,
  TaskType,
  CreateTaskPayload,
} from '@/services/task.service';
import {
  ListTodo,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  Plus,
  TrendingUp,
  Cpu,
  Layers,
  RefreshCw,
} from 'lucide-react';

export default function HomePage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}

function DashboardContent() {
  const queryClient = useQueryClient();
  const { isConnected } = useSocket();

  // Component States
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTaskForLogs, setSelectedTaskForLogs] = useState<Task | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<TaskType | 'ALL'>('ALL');
  const [page, setPage] = useState(1);

  // TanStack Query: Fetch Tasks
  const {
    data: tasksData,
    isLoading: isTasksLoading,
    refetch: refetchTasks,
  } = useQuery({
    queryKey: ['tasks', search, statusFilter, typeFilter, page],
    queryFn: () =>
      taskService.getTasks({
        search: search || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        type: typeFilter === 'ALL' ? undefined : typeFilter,
        page,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }),
  });

  // TanStack Query: Fetch Stats Summary
  const { data: statsData } = useQuery({
    queryKey: ['taskStats'],
    queryFn: () => taskService.getStatsSummary(),
    refetchInterval: 5000,
  });

  // Mutations
  const createTaskMutation = useMutation({
    mutationFn: (payload: CreateTaskPayload) => taskService.createTask(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['taskStats'] });
    },
  });

  const retryTaskMutation = useMutation({
    mutationFn: (taskId: string) => taskService.retryTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['taskStats'] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: string) => taskService.deleteTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['taskStats'] });
    },
  });

  const handleCreateTask = async (payload: CreateTaskPayload) => {
    await createTaskMutation.mutateAsync(payload);
  };

  const handleRetryTask = (taskId: string) => {
    retryTaskMutation.mutate(taskId);
  };

  const handleDeleteTask = (taskId: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      deleteTaskMutation.mutate(taskId);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#090d16] text-slate-100 selection:bg-indigo-500/30">
      {/* Top Navbar */}
      <Navbar />

      <div className="flex flex-1">
        {/* Left Navigation Sidebar */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-8 space-y-8 max-w-7xl mx-auto w-full">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={isConnected ? 'COMPLETED' : 'FAILED'} pulse={isConnected}>
                  {isConnected ? 'Socket.IO Real-Time Active' : 'Connecting Sockets...'}
                </Badge>
                <span className="text-xs text-slate-400">• BullMQ Async Queue Engine</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Task Automation Dashboard
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Live queue execution metrics, worker concurrency, and automated task logs.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="md"
                onClick={() => refetchTasks()}
                className="gap-1.5"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => setIsCreateModalOpen(true)}
                className="gap-1.5"
              >
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
                <span className="text-3xl font-bold text-white">{statsData?.total || 0}</span>
                <span className="text-xs font-medium text-emerald-400 flex items-center gap-0.5">
                  <TrendingUp className="h-3 w-3" /> Live
                </span>
              </div>
            </Card>

            <Card className="relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Processing / Pending
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <PlayCircle className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-indigo-400">
                  {(statsData?.processing || 0) + (statsData?.pending || 0)}
                </span>
                <span className="text-xs text-slate-400">
                  {statsData?.processing || 0} active, {statsData?.pending || 0} queued
                </span>
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
                <span className="text-3xl font-bold text-emerald-400">
                  {statsData?.completed || 0}
                </span>
                <span className="text-xs text-slate-400">100% finished</span>
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
                <span className="text-3xl font-bold text-rose-400">{statsData?.failed || 0}</span>
                <span className="text-xs text-slate-400">Max retries exceeded</span>
              </div>
            </Card>
          </div>

          {/* Interactive Task Queue Table */}
          <TaskTable
            tasks={tasksData?.tasks || []}
            pagination={
              tasksData?.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 }
            }
            search={search}
            onSearchChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            statusFilter={statusFilter}
            onStatusFilterChange={(st) => {
              setStatusFilter(st);
              setPage(1);
            }}
            typeFilter={typeFilter}
            onTypeFilterChange={(tp) => {
              setTypeFilter(tp);
              setPage(1);
            }}
            page={page}
            onPageChange={(p) => setPage(p)}
            onViewLogs={(task) => setSelectedTaskForLogs(task)}
            onRetryTask={handleRetryTask}
            onDeleteTask={handleDeleteTask}
            isLoading={isTasksLoading}
          />
        </main>
      </div>

      {/* Modals */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateTask}
        isLoading={createTaskMutation.isPending}
      />

      <TaskLogModal
        task={selectedTaskForLogs}
        isOpen={!!selectedTaskForLogs}
        onClose={() => setSelectedTaskForLogs(null)}
      />

      {/* Footer */}
      <Footer />
    </div>
  );
}
