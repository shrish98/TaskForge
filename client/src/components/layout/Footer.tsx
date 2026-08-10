import React from 'react';
import { Server, Database, Radio } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-[#e5e3dc] bg-white py-4 px-6 text-xs text-zinc-500">
      <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[#18181b]">TaskForge Engine v1.0.0</span>
          <span>•</span>
          <span>Production Micro-SaaS Architecture</span>
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          <div className="flex items-center gap-1.5">
            <Server className="h-3.5 w-3.5 text-[#f05228]" />
            <span>Express API Gateway</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Database className="h-3.5 w-3.5 text-amber-600" />
            <span>PostgreSQL & Redis</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Radio className="h-3.5 w-3.5 text-emerald-600" />
            <span>Socket.IO Engine</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
