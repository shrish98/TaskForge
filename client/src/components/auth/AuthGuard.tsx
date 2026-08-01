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
      <div className="flex min-h-screen items-center justify-center bg-[#090d16] text-slate-200">
        <div className="flex flex-col items-center gap-3">
          <svg className="h-8 w-8 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="text-xs font-semibold tracking-wider text-slate-400">Authenticating Session...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
