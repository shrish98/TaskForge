'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { logoutUser } from '@/store/slices/authSlice';
import { Cpu, LogOut, Shield } from 'lucide-react';

export const Navbar: React.FC = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#e5e3dc] bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f05228] shadow-md shadow-[#f05228]/25 text-white">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-[#18181b]">TaskForge</span>
              <span className="rounded-full bg-[#fff4f0] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#f05228] border border-[#fcd5c7]">
                PRO
              </span>
            </div>
            <p className="text-[11px] font-medium text-zinc-500 hidden sm:block">
              Asynchronous Job & Distributed Queue Engine
            </p>
          </div>
        </Link>

        {/* Live System Indicator & User Actions */}
        <div className="flex items-center gap-4">
          {/* WebSocket Live Health Badge */}
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Sockets & Redis Connected</span>
          </div>

          {/* User Badge / Profile */}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3 border-l border-[#e5e3dc] pl-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f0efe9] text-[#18181b] border border-[#e5e3dc] font-semibold text-sm">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="hidden md:block text-left">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-semibold text-[#18181b]">{user.name}</p>
                    {user.role === 'ADMIN' && (
                      <span className="rounded bg-purple-50 px-1.5 py-0.2 text-[9px] font-bold text-purple-700 border border-purple-200">
                        ADMIN
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-500">{user.email}</p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1 rounded-xl border border-[#e5e3dc] bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-[#f0efe9] hover:text-zinc-900 transition-colors"
                title="Logout"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 border-l border-[#e5e3dc] pl-4">
              <Link
                href="/login"
                className="rounded-xl bg-[#f05228] hover:bg-[#ea580c] px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-[#f05228]/20 transition-all"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
