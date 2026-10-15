'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { clearError, loginUser, registerUser } from '@/store/slices/authSlice';
import { Mark } from '@/components/brand/Mark';

const DEMO = { email: 'user@taskforge.ai', password: 'UserPassword123!' };

// A static excerpt of what the console log looks like, so the sign-in page isn't an empty box.
const SAMPLE = [
  ['14:21:58.330', 'webhook', 'Attempt 1 failed: HTTP 503. Retrying in 2s.', 'warn'],
  ['14:22:00.402', 'webhook', 'Attempt 2 failed: HTTP 503. Retrying in 4s.', 'warn'],
  ['14:22:04.511', 'webhook', 'Webhook delivered: HTTP 200 in 88 ms.', ''],
  ['14:22:07.112', 'ocr', 'Queued for a worker', ''],
  ['14:22:07.161', 'ocr', 'Attempt 1/3 started on worker', ''],
  ['14:22:07.402', 'ocr', 'Running OCR on 164 KB image', ''],
  ['14:22:08.019', 'ocr', 'Recognised 212 words in 617 ms', ''],
  ['14:22:09.870', 'pdf', 'Report generated from 312 tasks (14.2 KB PDF).', ''],
];

export function AuthScreen({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthenticated, isLoading, error } = useAppSelector((s) => s.auth);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    dispatch(clearError());
  }, [dispatch, mode]);

  useEffect(() => {
    if (isAuthenticated) router.push('/');
  }, [isAuthenticated, router]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'login') dispatch(loginUser({ email, password }));
    else dispatch(registerUser({ name, email, password }));
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col px-6 py-6 sm:px-12">
        <Link href="/" className="flex items-center gap-2.5 text-[15px] font-semibold text-strong">
          <Mark /> TaskForge
        </Link>

        <div className="my-auto w-full max-w-sm py-12">
          <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-strong">{mode === 'login' ? 'Sign in' : 'Create an account'}</h1>
          <p className="mt-1.5 text-[13.5px] text-mute">
            {mode === 'login' ? 'Back to your queue.' : 'You get your own queue. Nobody else sees your jobs.'}
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            {mode === 'register' && (
              <label className="block">
                <span className="eyebrow mb-1.5 block">Name</span>
                <input className="field h-9" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} autoComplete="name" />
              </label>
            )}
            <label className="block">
              <span className="eyebrow mb-1.5 block">Email</span>
              <input className="field h-9" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </label>
            <label className="block">
              <span className="eyebrow mb-1.5 block">Password</span>
              <input
                className="field h-9"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={mode === 'register' ? 8 : 1}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              {mode === 'register' && <span className="mt-1 block text-[12px] text-faint">At least 8 characters.</span>}
            </label>

            {error && <p className="border-l-2 border-bad bg-bad-soft px-3 py-2 font-mono text-[12px] text-bad">{error}</p>}

            <button type="submit" className="btn btn-primary h-9 w-full" disabled={isLoading}>
              {isLoading ? 'One moment…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          {mode === 'login' && (
            <button
              type="button"
              onClick={() => {
                setEmail(DEMO.email);
                setPassword(DEMO.password);
                dispatch(loginUser(DEMO));
              }}
              className="mt-3 w-full rounded border border-dashed border-line px-3 py-2.5 text-left transition-colors hover:border-amber/60"
            >
              <span className="block text-[13px] text-strong">Use the demo account</span>
              <span className="font-mono text-[11.5px] text-faint">{DEMO.email}</span>
            </button>
          )}

          <p className="mt-8 text-[13px] text-mute">
            {mode === 'login' ? (
              <>
                No account? <Link href="/register" className="text-amber hover:underline">Create one</Link>
              </>
            ) : (
              <>
                Already have one? <Link href="/login" className="text-amber hover:underline">Sign in</Link>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="hidden border-l border-line bg-panel lg:flex lg:flex-col">
        <div className="flex items-center gap-3 border-b border-line px-8 py-4">
          <span className="eyebrow">log tail</span>
          <span className="font-mono text-[11px] text-faint">sample</span>
        </div>
        <ol className="flex-1 px-8 py-6 font-mono text-[12.5px] leading-[2]">
          {SAMPLE.map(([time, type, message, level], i) => (
            <li key={i} className="grid animate-fade-up grid-cols-[100px_64px_1fr] gap-3" style={{ animationDelay: `${i * 90}ms` }}>
              <span className="text-faint">{time}</span>
              <span className="text-mute">{type}</span>
              <span className={level === 'warn' ? 'text-amber' : 'text-ink'}>{message}</span>
            </li>
          ))}
        </ol>
        <p className="border-t border-line px-8 py-4 text-[12.5px] text-faint">
          Five real job types, three attempts each with backoff, then a dead-letter queue. Progress streams over Socket.IO.
        </p>
      </div>
    </div>
  );
}
