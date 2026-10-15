'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAppSelector } from '../store/store';
import type { PaginatedTasksResponse, Task, TaskStatus } from '../services/task.service';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

interface TaskStatusEvent {
  taskId: string;
  status: TaskStatus;
  progress: number;
  message?: string;
  error?: string | null;
}

export const useSocket = () => {
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const socket: Socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      // A function, so every reconnect sends the current token (the API client refreshes it).
      auth: (cb) => cb({ token: localStorage.getItem('accessToken') }),
      reconnectionDelay: 1000,
    });

    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    // The server rejects an expired token, and Socket.IO doesn't retry a rejected handshake on
    // its own. By the time this fires the API client has usually refreshed the token, so retry.
    socket.on('connect_error', () => {
      setIsConnected(false);
      clearTimeout(retryTimer);
      retryTimer = setTimeout(() => socket.connect(), 5000);
    });

    socket.on('task:status_changed', (event: TaskStatusEvent) => {
      // Progress ticks are patched straight into the cached lists, so bars move without a refetch.
      queryClient.setQueriesData<PaginatedTasksResponse>({ queryKey: ['tasks'] }, (old) =>
        old && {
          ...old,
          tasks: old.tasks.map((t: Task) =>
            t.id === event.taskId ? { ...t, status: event.status, progress: event.progress } : t
          ),
        }
      );
      queryClient.invalidateQueries({ queryKey: ['task', event.taskId] });
      scheduleRefetch(event.status !== 'PROCESSING');
    });

    // Everything else (attempt counts, the timeline, log lines, totals) is refetched, but at most
    // a few times a second, so a burst of 50 jobs doesn't turn into hundreds of requests.
    let refetchTimer: ReturnType<typeof setTimeout> | undefined;
    let includeTotals = false;
    function scheduleRefetch(totals: boolean) {
      includeTotals ||= totals;
      if (refetchTimer) return;
      refetchTimer = setTimeout(() => {
        refetchTimer = undefined;
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        queryClient.invalidateQueries({ queryKey: ['timeline'] });
        queryClient.invalidateQueries({ queryKey: ['logs'] });
        if (includeTotals) {
          queryClient.invalidateQueries({ queryKey: ['taskStats'] });
          queryClient.invalidateQueries({ queryKey: ['systemMetrics'] });
          includeTotals = false;
        }
      }, 300);
    }

    return () => {
      clearTimeout(retryTimer);
      clearTimeout(refetchTimer);
      socket.disconnect();
    };
  }, [isAuthenticated, queryClient, user]);

  return { isConnected };
};
