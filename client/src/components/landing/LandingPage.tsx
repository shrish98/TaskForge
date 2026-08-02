'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/store/store';
import {
  Zap,
  Server,
  Shield,
  Activity,
  Cpu,
  Layers,
  Terminal,
  CheckCircle2,
  ArrowRight,
  Code2,
  Lock,
  RefreshCw,
  GitBranch,
  Gauge,
  Sparkles,
  HelpCircle,
  ChevronDown,
  Globe,
  Database,
  BarChart3,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const router = useRouter();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const [isMounted, setIsMounted] = useState(false);

  // Live Interactive Demo Simulation State
  const [demoProgress, setDemoProgress] = useState(35);
  const [demoStatus, setDemoStatus] = useState<'PENDING' | 'PROCESSING' | 'COMPLETED'>('PROCESSING');
  const [activeCodeTab, setActiveCodeTab] = useState<'curl' | 'node' | 'worker'>('node');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Simulate real-time job progress ring on landing page
  useEffect(() => {
    const interval = setInterval(() => {
      setDemoProgress((prev) => {
        if (prev >= 100) {
          setDemoStatus('COMPLETED');
          setTimeout(() => {
            setDemoProgress(0);
            setDemoStatus('PROCESSING');
          }, 2000);
          return 100;
        }
        return prev + 15;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      icon: <Zap className="h-6 w-6 text-amber-400" />,
      title: 'BullMQ & Redis Engine',
      description:
        'High-performance background job processing backed by Redis 7 and BullMQ queues with automatic retry exponential backoff strategies.',
      badge: 'Core Queue Engine',
    },
    {
      icon: <Activity className="h-6 w-6 text-emerald-400" />,
      title: 'Real-Time WebSocket Streams',
      description:
        'Live job state notifications (`job:progress`, `job:completed`, `job:failed`) broadcasted over Socket.IO to eliminate polling overhead.',
      badge: 'Sub-10ms Streaming',
    },
    {
      icon: <Shield className="h-6 w-6 text-purple-400" />,
      title: 'Role-Based Security (RBAC)',
      description:
        'Multi-tenant user data isolation with dual JWT access & refresh token rotation and global administrative oversight for system admins.',
      badge: 'JWT & Admin Telemetry',
    },
    {
      icon: <Cpu className="h-6 w-6 text-indigo-400" />,
      title: 'Multi-Worker Pool Scalability',
      description:
        'Decoupled worker instances capable of processing file operations, report generation, web scraping, and automated email dispatches.',
      badge: 'Concurrency 5x',
    },
    {
      icon: <Terminal className="h-6 w-6 text-cyan-400" />,
      title: 'Deep Execution Logs',
      description:
        'Step-by-step audit logs, execution timing, raw payload JSON inspection, and full error stack trace capture for instant debugging.',
      badge: 'Audit Trail',
    },
    {
      icon: <Layers className="h-6 w-6 text-pink-400" />,
      title: 'Production Docker Containerized',
      description:
        'Complete dockerized environment with multi-stage Dockerfiles, Docker Compose orchestrations, and automated GitHub Actions CI/CD.',
      badge: 'CI/CD Ready',
    },
  ];

  const codeSnippets = {
    node: `// 1. Dispatch Task to TaskForge REST API
const response = await fetch('http://localhost:5000/api/v1/tasks', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${accessToken}\`
  },
  body: JSON.stringify({
    title: 'Process Monthly Financial Report',
    type: 'REPORT_GENERATION',
    priority: 3,
    payload: { month: 'August', year: 2026, format: 'PDF' }
  })
});

const { data: task } = await response.json();
console.log(\`Task \${task.id} queued successfully!\`);`,
    curl: `# 2. Dispatch Task via cURL CLI
curl -X POST http://localhost:5000/api/v1/tasks \\
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Batch Image Compression",
    "type": "FILE_PROCESSING",
    "priority": 2,
    "payload": { "folder": "/uploads/raw" }
  }'`,
    worker: `// 3. BullMQ Worker Execution Handler
export const taskWorker = new Worker('task_queue', async (job) => {
  logger.info(\`Processing Job #\${job.id} (Type: \${job.data.type})\`);
  
  // Update progress ring via WebSockets
  await job.updateProgress(50);
  
  const result = await executeHeavyTask(job.data.payload);
  return { status: 'COMPLETED', result };
}, { connection: redisConfig, concurrency: 5 });`,
  };

  const faqs = [
    {
      q: 'What makes TaskForge different from basic background job libraries?',
      a: 'TaskForge is an end-to-end job orchestration platform. It integrates BullMQ Redis queues, bidirectional Socket.IO streaming, dual JWT authentication, multi-tenant RBAC permissions, and an executive Next.js dark-mode UI out of the box.',
    },
    {
      q: 'How does real-time progress streaming work?',
      a: 'When a worker updates job progress (e.g. `job.updateProgress(75)`), the BullMQ QueueEvents listener detects the update and immediately emits a `job:progress` event over Socket.IO to connected browser clients, triggering instant UI state invalidation.',
    },
    {
      q: 'Can I deploy TaskForge using Docker?',
      a: 'Yes! TaskForge includes preconfigured multi-stage `Dockerfile` manifests for the Express API, BullMQ Worker, and Next.js client, along with `docker-compose.yml` for 1-command local or production deployment.',
    },
    {
      q: 'What is the difference between USER and ADMIN roles?',
      a: 'Standard users only see and manage their own background jobs. Admin users gain global administrative visibility to monitor telemetry metrics, view tasks across all workspace users, and retry failed jobs across the system.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 selection:bg-indigo-500/30 overflow-x-hidden font-sans">
      {/* Background Radial Ambient Glows */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-tr from-indigo-600/20 via-purple-600/15 to-transparent rounded-full filter blur-[120px] pointer-events-none -z-10" />
      <div className="fixed bottom-0 right-0 w-[600px] h-[400px] bg-indigo-900/10 filter blur-[140px] pointer-events-none -z-10" />

      {/* Top Glass Navigation Bar */}
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-[#090d16]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/25 border border-indigo-400/30">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                TaskForge <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">v1.0 Engine</span>
              </span>
              <p className="text-[11px] text-slate-400 font-medium">Distributed Job Processing Platform</p>
            </div>
          </div>

          {/* Nav Links & Auth CTA */}
          <div className="flex items-center gap-4">
            {isMounted && isAuthenticated ? (
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:scale-[1.02] transition-all"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-xs font-semibold text-slate-300 hover:text-white transition-colors px-3 py-2"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 hover:scale-[1.02] transition-all"
                >
                  <span>Get Started Free</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 md:pt-16 md:pb-28 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Hero Left Content (Main Heading Section - 7/12 width) */}
          <div className="lg:col-span-7 text-left space-y-6">
            {/* Real-Time Engine Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1.5 text-xs font-semibold text-indigo-300 backdrop-blur-md shadow-inner">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              <span>Real-Time BullMQ + Socket.IO Distributed Architecture</span>
            </div>

            {/* Main Hero Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.12] text-white">
              High-Performance <br />
              <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-amber-300 bg-clip-text text-transparent">
                Async Job Processing Engine
              </span>
            </h1>

            {/* Hero Subtitle */}
            <p className="text-base sm:text-lg text-slate-400 leading-relaxed max-w-2xl">
              Power your background queues, scheduled tasks, and heavy worker processing with Redis persistence, automatic retry policies, and live WebSocket telemetry metrics.
            </p>

            {/* Hero Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-start gap-4 pt-2">
              <Link
                href="/register"
                className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 px-7 py-4 text-sm font-bold text-white shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:scale-[1.02] transition-all"
              >
                <Sparkles className="h-4 w-4" />
                <span>Launch Demo Engine</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 px-7 py-4 text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all"
              >
                <Lock className="h-4 w-4 text-indigo-400" />
                <span>Sign In with Demo Account</span>
              </Link>
            </div>
          </div>

          {/* Live Interactive Telemetry Preview Mockup (Adjacent Right Column - 5/12 width) */}
          <div className="lg:col-span-5 relative w-full rounded-3xl border border-slate-800/80 bg-slate-950/80 p-4 sm:p-5 shadow-2xl backdrop-blur-2xl overflow-hidden shadow-indigo-500/10">
            {/* Top Mockup Header Bar */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-rose-500/80" />
                <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                <span className="ml-2 font-mono text-[11px] text-slate-500 truncate max-w-[160px] sm:max-w-none">
                  taskforge-telemetry.internal
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-mono text-[10px] font-semibold text-emerald-400">
                  ACTIVE POOL
                </span>
              </div>
            </div>

            {/* Interactive Live Worker Status Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-4">
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-3">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>Queue Concurrency</span>
                  <Cpu className="h-3.5 w-3.5 text-indigo-400" />
                </div>
                <div className="text-lg font-extrabold text-white mt-1">5 Workers</div>
                <div className="text-[10px] text-emerald-400 mt-0.5 font-mono">100% Efficiency</div>
              </div>

              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-3">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>Job Progress</span>
                  <Activity className="h-3.5 w-3.5 text-emerald-400" />
                </div>
                <div className="text-lg font-extrabold text-emerald-400 mt-1">{demoProgress}% Done</div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1.5 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-500"
                    style={{ width: `${demoProgress}%` }}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-3">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>Redis Latency</span>
                  <Zap className="h-3.5 w-3.5 text-amber-400" />
                </div>
                <div className="text-lg font-extrabold text-amber-300 mt-1">&lt; 1.8 ms</div>
                <div className="text-[10px] text-slate-400 mt-0.5 font-mono">Socket.IO Stream</div>
              </div>
            </div>

            {/* Terminal Logs Simulation */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3 font-mono text-[10px] sm:text-[11px] text-slate-300 space-y-1.5 leading-relaxed">
              <div className="flex items-center gap-2 text-indigo-400">
                <Terminal className="h-3.5 w-3.5" />
                <span className="font-bold">TaskForge Stream Terminal</span>
              </div>
              <div className="text-slate-400">[19:42:01] ⚡ Worker ready on Redis 6379</div>
              <div className="text-indigo-300">
                [19:42:05] 🔄 Job #task_8921 (REPORT_GENERATION)
              </div>
              <div className="text-amber-300">
                [19:42:06] 📊 `job:progress` event &rarr; {demoProgress}%
              </div>
              {demoStatus === 'COMPLETED' && (
                <div className="text-emerald-400 font-bold">
                  [19:42:08] ✅ Job #task_8921 COMPLETED in 2.4s
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Banner */}
      <section className="border-y border-slate-800/80 bg-slate-900/30 py-12 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono">99.99%</div>
            <div className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">Queue Uptime SLA</div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-indigo-400 font-mono">5,000+</div>
            <div className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">Jobs / Sec Scalability</div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-amber-400 font-mono">&lt; 2 ms</div>
            <div className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">Sub-ms Queue Latency</div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-purple-400 font-mono">100%</div>
            <div className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">RBAC Multi-Tenant</div>
          </div>
        </div>
      </section>

      {/* Core Features Grid Section */}
      <section className="py-20 md:py-28 px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-300">
            <Gauge className="h-3.5 w-3.5" />
            <span>Built for Modern Scale</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            Everything You Need for <br />
            <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
              Fault-Tolerant Background Workflows
            </span>
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            Engineered from the ground up with modular architecture, strict TypeScript validation, and real-time observability.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="group relative rounded-3xl border border-slate-800/80 bg-slate-900/40 p-8 hover:bg-slate-900/80 hover:border-indigo-500/50 transition-all duration-300 shadow-xl hover:shadow-indigo-500/10"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800/80 border border-slate-700/60 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-800/60 px-2.5 py-1 rounded-full border border-slate-700/50">
                  {feature.badge}
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3 group-hover:text-indigo-300 transition-colors">
                {feature.title}
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Developer API Integration Section */}
      <section className="py-20 px-6 max-w-7xl mx-auto border-t border-slate-800/80">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300">
              <Code2 className="h-3.5 w-3.5" />
              <span>Developer First APIs</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Enqueue Tasks in Seconds with Clean REST APIs
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              TaskForge exposes straightforward REST endpoints protected by JWT access tokens. Dispatch tasks asynchronously from any Node.js, Python, or Go microservice.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 text-xs font-medium text-slate-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Automatic Zod schema validation for strict payload safety</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-medium text-slate-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Custom task priorities, scheduled execution, and retry limits</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-medium text-slate-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Standardized JSON response envelope with pagination metadata</span>
              </div>
            </div>
          </div>

          {/* Interactive Code Window */}
          <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
            {/* Code Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-4 mb-4">
              <button
                onClick={() => setActiveCodeTab('node')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeCodeTab === 'node'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Node.js Client
              </button>
              <button
                onClick={() => setActiveCodeTab('curl')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeCodeTab === 'curl'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                cURL Request
              </button>
              <button
                onClick={() => setActiveCodeTab('worker')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeCodeTab === 'worker'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                BullMQ Worker Handler
              </button>
            </div>

            {/* Code Display */}
            <pre className="font-mono text-xs text-slate-200 overflow-x-auto p-4 rounded-2xl bg-slate-900/60 leading-relaxed">
              <code>{codeSnippets[activeCodeTab]}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-6 max-w-4xl mx-auto border-t border-slate-800/80">
        <div className="text-center mb-12 space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
            <HelpCircle className="h-3.5 w-3.5" />
            <span>Frequently Asked Questions</span>
          </div>
          <h2 className="text-3xl font-extrabold text-white">Got Questions? We Have Answers.</h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden"
            >
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full p-5 text-left flex items-center justify-between text-sm font-bold text-white hover:text-indigo-300 transition-colors"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${
                    openFaq === idx ? 'rotate-180 text-indigo-400' : ''
                  }`}
                />
              </button>
              {openFaq === idx && (
                <div className="px-5 pb-5 text-xs text-slate-400 leading-relaxed border-t border-slate-800/60 pt-4">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Call To Action Banner */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <div className="relative rounded-3xl bg-gradient-to-r from-indigo-900/60 via-purple-900/50 to-slate-900 border border-indigo-500/30 p-10 sm:p-16 text-center space-y-6 shadow-2xl overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 filter blur-3xl pointer-events-none" />

          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Ready to Experience TaskForge in Action?
          </h2>
          <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto">
            Test background task execution, real-time Socket.IO progress bars, and global administrative permissions today.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto rounded-2xl bg-white px-8 py-4 text-sm font-extrabold text-slate-950 hover:bg-slate-100 shadow-xl transition-all hover:scale-[1.03]"
            >
              Create Free Account
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto rounded-2xl border border-slate-700 bg-slate-900/80 px-8 py-4 text-sm font-semibold text-slate-200 hover:bg-slate-800 transition-all"
            >
              Sign In to Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-12 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-indigo-400" />
            <span className="font-bold text-slate-300">TaskForge Engine v1.0</span>
            <span>— Built with Next.js 14, Express, Prisma & BullMQ</span>
          </div>
          <div>© {new Date().getFullYear()} TaskForge Platform. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
};
