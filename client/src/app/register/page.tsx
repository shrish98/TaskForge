'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { registerUser, clearError } from '@/store/slices/authSlice';
import { Cpu, Lock, Mail, User as UserIcon, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function RegisterPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthenticated, isLoading, error } = useAppSelector((state) => state.auth);

  const [name, setName] = useState('');
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
    if (!name || !email || !password) return;
    dispatch(registerUser({ name, email, password }));
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f6f5f2] p-4 text-[#18181b] selection:bg-[#f05228]/20">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f05228] shadow-xl shadow-[#f05228]/25 text-white">
            <Cpu className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#18181b]">Create TaskForge Account</h1>
          <p className="text-xs text-zinc-500">
            Provision your micro-SaaS workspace & background task worker access
          </p>
        </div>

        {/* Register Form Card */}
        <Card className="border-[#e5e3dc] bg-white p-6 sm:p-8 backdrop-blur-xl shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                <span className="font-semibold">Registration Error:</span> {error}
              </div>
            )}

            {/* Full Name Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-zinc-400">
                  <UserIcon className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full rounded-xl border border-[#e5e3dc] bg-white py-2.5 pl-10 pr-4 text-xs text-[#18181b] placeholder-zinc-400 focus:border-[#f05228] focus:outline-none focus:ring-1 focus:ring-[#f05228] transition-colors"
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-zinc-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="developer@example.com"
                  className="w-full rounded-xl border border-[#e5e3dc] bg-white py-2.5 pl-10 pr-4 text-xs text-[#18181b] placeholder-zinc-400 focus:border-[#f05228] focus:outline-none focus:ring-1 focus:ring-[#f05228] transition-colors"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-zinc-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full rounded-xl border border-[#e5e3dc] bg-white py-2.5 pl-10 pr-4 text-xs text-[#18181b] placeholder-zinc-400 focus:border-[#f05228] focus:outline-none focus:ring-1 focus:ring-[#f05228] transition-colors"
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
              Create Account <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </Card>

        {/* Footer Link to Login */}
        <p className="text-center text-xs text-zinc-500">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-[#f05228] hover:text-[#ea580c] hover:underline">
            Sign in to existing account
          </Link>
        </p>
      </div>
    </div>
  );
}
