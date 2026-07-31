export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <div className="max-w-3xl space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-semibold text-indigo-400">
          <span>🚀 Saarthi AI Assessment</span>
          <span>•</span>
          <span>Step 1 Initialized</span>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl bg-gradient-to-r from-white via-slate-200 to-indigo-400 bg-clip-text text-transparent">
          Task Automation & Job Processing Platform
        </h1>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto">
          Production-grade Micro-SaaS module powered by Next.js 14, Express, PostgreSQL, Redis, BullMQ async workers & Socket.IO real-time sync.
        </p>
      </div>
    </main>
  );
}
