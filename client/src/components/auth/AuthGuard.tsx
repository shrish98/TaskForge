'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { fetchCurrentUser } from '@/store/slices/authSlice';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children, requireAdmin = false }) => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, isLoading } = useAppSelector((state) => state.auth);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
    } else if (!user) {
      dispatch(fetchCurrentUser());
    }
  }, [dispatch, router, user]);

  useEffect(() => {
    if (!isLoading && isAuthenticated && requireAdmin && user?.role !== 'ADMIN') {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, requireAdmin, router, user]);

  if (isLoading || (!user && typeof window !== 'undefined' && localStorage.getItem('accessToken'))) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="flex items-center gap-2 font-mono text-[12px] text-faint">
          <span className="h-[7px] w-[7px] animate-blink rounded-full bg-amber" />
          connecting to the queue…
        </p>
      </div>
    );
  }

  return <>{children}</>;
};
