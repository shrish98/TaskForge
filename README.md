# 🚀 TaskForge - Task Automation & Job Processing SaaS Platform

> **Full-Stack Technical Assessment** built with TaskForge.

This application is a production-ready **Micro-SaaS Job Processing Platform** featuring asynchronous background job execution via **BullMQ**, real-time live status updates via **Socket.IO WebSockets**, dual **JWT authentication with Redis refresh token storage**, relational persistence with **PostgreSQL & Prisma ORM**, and a modern dashboard built with **Next.js 14 (App Router)**.

---

## 🏗️ Architecture & Component Breakdown

```
taskforge/
├── .github/
│   └── workflows/
│       └── ci.yml             # Automated GitHub Actions CI/CD Pipeline
├── docker-compose.yml         # Multi-container orchestrator (Postgres, Redis, Server, Worker, Client)
├── .env.example               # Central environment variables schema
├── .gitignore
├── README.md
├── server/                    # Express API Gateway & BullMQ Async Worker
│   ├── Dockerfile             # Multi-stage API Gateway container image
│   ├── Dockerfile.worker      # Standalone BullMQ Worker container image
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts           # Express API & Socket server entrypoint
│       └── worker.ts          # Standalone Queue Worker process entrypoint
└── client/                    # Next.js 14 Micro-SaaS Frontend
    ├── Dockerfile             # Multi-stage Next.js standalone container image
    ├── package.json
    ├── next.config.mjs
    ├── tailwind.config.ts
    └── src/
        └── app/               # Next.js 14 App Router layout & pages
```

---

## 🛠️ Technology Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Redux Toolkit, TanStack Query v5, Tailwind CSS, Lucide Icons, Framer Motion.
- **Backend API**: Node.js, Express.js, TypeScript, Zod, JWT Auth, Winston Logger.
- **Database & ORM**: PostgreSQL 16, Prisma ORM (Type-safe queries, indexing, migrations, seed data).
- **Asynchronous Queue**: Redis 7, BullMQ (Workers, delays, exponential backoff retries).
- **Real-Time Sync**: Socket.IO WebSockets (Emitting job progress % and status changes live).
- **DevOps**: Docker, Docker Compose, GitHub Actions CI/CD pipeline.

---

## ⚡ Quick Start with Docker

Ensure you have [Docker](https://www.docker.com/) installed on your machine.

```bash
# 1. Clone the public repository
git clone https://github.com/shrish98/taskforge.git
cd taskforge

# 2. Copy environment configuration
cp .env.example .env

# 3. Start all containers (Postgres, Redis, Server, Worker, Client)
docker compose up --build -d
```

### Access Services:
- 🌐 **Frontend Dashboard**: `http://localhost:3000`
- ⚙️ **Express API Gateway**: `http://localhost:5000/api/v1`
- 🟢 **API Health Check**: `http://localhost:5000/health`
- 🐘 **PostgreSQL DB**: `localhost:5432`
- 🔴 **Redis Cache**: `localhost:6379`

---

## 🔄 CI/CD Automation

This repository includes a fully configured **GitHub Actions Workflow** ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) that automatically triggers on every `push` and `pull_request` to:
1. Spin up PostgreSQL and Redis service containers in GitHub runners.
2. Run backend TypeScript compilation check (`tsc --noEmit`) and Jest unit/integration tests.
3. Run Next.js frontend TypeScript compilation and build checks (`npm run build`).
4. Validate Docker Compose multi-container build integrity.
