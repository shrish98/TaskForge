'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { loginUser, clearError } from '@/store/slices/authSlice';
import { Cpu, Lock, Mail, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthenticated, isLoading, error } = useAppSelector((state) => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    dispatch(loginUser({ email, password }));
  };

  const handleFillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#090d16] p-4 text-slate-100 selection:bg-indigo-500/30">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 shadow-xl shadow-indigo-500/25">
            <Cpu className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Welcome back to TaskForge</h1>
          <p className="text-xs text-slate-400">
            Sign in to access your asynchronous job queue & real-time telemetry
          </p>
        </div>

        {/* Login Glass Form Card */}
        <Card className="border-slate-800/80 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                <span className="font-semibold">Authentication Error:</span> {error}
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@taskforge.ai"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/60 py-2.5 pl-10 pr-4 text-xs text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">Password</label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/60 py-2.5 pl-10 pr-4 text-xs text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isLoading}
              className="w-full mt-2"
            >
              Sign In to TaskForge <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          {/* Quick Demo Logins Helper */}
          <div className="mt-6 border-t border-slate-800/80 pt-4 space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <KeyRound className="h-3.5 w-3.5 text-indigo-400" />
              <span>Quick Demo Logins</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleFillDemo('user@taskforge.ai', 'UserPassword123!')}
                className="rounded-lg border border-slate-800 bg-slate-950/40 p-2 text-left hover:border-indigo-500/40 hover:bg-slate-900 transition-all"
              >
                <div className="font-semibold text-slate-200">Demo User</div>
                <div className="text-[10px] text-slate-500">user@taskforge.ai</div>
              </button>

              <button
                type="button"
                onClick={() => handleFillDemo('admin@taskforge.ai', 'AdminPassword123!')}
                className="rounded-lg border border-slate-800 bg-slate-950/40 p-2 text-left hover:border-purple-500/40 hover:bg-slate-900 transition-all"
              >
                <div className="font-semibold text-purple-300">Admin User</div>
                <div className="text-[10px] text-slate-500">admin@taskforge.ai</div>
              </button>
            </div>
          </div>
        </Card>

        {/* Footer Link to Register */}
        <p className="text-center text-xs text-slate-400">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-semibold text-indigo-400 hover:text-indigo-300 hover:underline">
            Register new workspace account
          </Link>
        </p>
      </div>
    </div>
  );
}
