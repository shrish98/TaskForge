# 🚀 TaskForge - Distributed Task Automation & Real-Time Job Processing Engine

> Production-ready **Micro-SaaS Asynchronous Task Processing Platform** built with Node.js, Express, TypeScript, BullMQ, Redis, PostgreSQL, Prisma ORM, Socket.IO WebSockets, and Next.js 14 (App Router).

---

## 🌟 Executive Overview

TaskForge solves the challenge of handling heavy or time-consuming background operations (such as file conversion, OCR extraction, web scraping, PDF report generation, and batch email dispatching) without blocking HTTP API request threads.

### Key Capabilities:
- **Non-Blocking Architecture**: Express API Gateway offloads background workloads to dedicated BullMQ Redis Workers.
- **Real-Time Telemetry**: Socket.IO WebSockets broadcast live job progress (`0%` ➔ `100%`), state transitions (`PENDING` ➔ `PROCESSING` ➔ `COMPLETED` / `FAILED`), and audit logs directly to connected user rooms.
- **Enterprise Security**: Dual-token JWT Authentication (15-min Access Tokens + 7-day Refresh Tokens stored in Redis & DB), password hashing with `bcrypt`, and Role-Based Access Control (`USER` / `ADMIN`).
- **Resilient Execution**: Automatic exponential backoff retries (max 3 attempts), delay scheduling, priority queueing (P1–P3), and error handling with full audit log trails (`TaskLog`).
- **Production Dashboard**: Built with Next.js 14 App Router, Redux Toolkit for global user state, TanStack Query v5 for server state caching, and Tailwind CSS glassmorphic UI.

---

## 🏗️ Architecture & Component Directory

```
taskforge/
├── .github/
│   └── workflows/
│       └── ci.yml             # Automated GitHub Actions CI/CD Pipeline
├── docker-compose.yml         # Multi-container orchestrator (Postgres, Redis, Server, Worker, Client)
├── .env.example               # Central environment variables schema
├── README.md                  # Comprehensive System Documentation
├── server/                    # Express API Gateway & BullMQ Async Worker
│   ├── Dockerfile             # Multi-stage API Gateway container image
│   ├── Dockerfile.worker      # Standalone BullMQ Worker container image
│   ├── package.json
│   ├── tsconfig.json
│   ├── jest.config.js
│   ├── prisma/
│   │   ├── schema.prisma      # PostgreSQL Schema (User, Task, RefreshToken, TaskLog)
│   │   └── seed.ts            # Automated Database Seeding Script
│   └── src/
│       ├── index.ts           # Express API & Socket.IO Gateway Entrypoint
│       ├── worker.ts          # Standalone Queue Worker Process Entrypoint
│       ├── config/            # Redis & Environment Configurations
│       ├── controllers/       # HTTP Request Handlers (Auth, Task)
│       ├── middlewares/       # AuthGuard, RateLimiter, ErrorHandler
│       ├── queues/            # BullMQ Task Queue & Processor Simulations
│       ├── repositories/      # Decoupled Prisma Data Access Layer
│       ├── routes/            # Express Endpoint Routers
│       ├── services/          # Business Logic (Task, Auth)
│       ├── socket/            # Socket.IO Real-Time Engine & User Rooms
│       └── utils/             # ApiError, ApiResponse, Logger, TokenUtils
└── client/                    # Next.js 14 Micro-SaaS Frontend
    ├── Dockerfile             # Multi-stage Next.js standalone container image
    ├── package.json
    ├── tailwind.config.ts
    └── src/
        ├── app/               # Next.js 14 App Router (/login, /register, /)
        ├── components/        # Glassmorphic UI Primitives, Navbar, Sidebar, TaskTable, Modals
        ├── hooks/             # Custom useSocket Real-Time Hook
        ├── lib/               # Axios Instance with Auto Refresh Interceptor
        ├── providers/         # Redux + TanStack Query Combined Provider
        ├── services/          # Client API Services (Auth, Task)
        └── store/             # Redux Toolkit Store & Auth Slice
```

---

## 🛠️ Complete Technology Stack

| Layer | Technology | Key Function / Role |
| :--- | :--- | :--- |
| **Frontend Framework** | Next.js 14 (App Router) | Server-Side Rendering, Client Component Routing, Optimization |
| **Global State** | Redux Toolkit | User session management, token persistence |
| **Server State** | TanStack Query v5 | Data fetching, background refetching, cache invalidation |
| **Styling** | Tailwind CSS + Lucide | Dark theme palette (`#090d16`), glassmorphism, micro-animations |
| **Backend Framework** | Express.js & Node.js | REST API Gateway, Routing, Socket Server Host |
| **Language** | TypeScript 5 | Strict type safety across client and server |
| **Database & ORM** | PostgreSQL 16 & Prisma | Relational entity storage, indexes, migrations, type-safe queries |
| **Async Queue** | Redis 7 & BullMQ | Asynchronous job queues, workers, delayed execution, backoff retries |
| **Real-Time** | Socket.IO | WebSockets engine emitting live progress % and task status updates |
| **Security** | JWT + bcrypt | Dual-token authentication with Redis refresh token invalidation |
| **DevOps & Testing** | Docker & GitHub Actions | Multi-container orchestration, Jest unit testing, CI build validation |

---

## ⚡ Quick Start with Docker

Ensure you have [Docker](https://www.docker.com/) installed.

```bash
# 1. Clone the repository
git clone https://github.com/shrish98/taskforge.git
cd taskforge

# 2. Copy environment configuration
cp .env.example .env

# 3. Spin up all 5 microservice containers (Postgres, Redis, Server, Worker, Client)
docker compose up --build -d
```

### Access Local Services:
- 🌐 **Next.js Frontend Dashboard**: `http://localhost:3000`
- ⚙️ **Express API Gateway**: `http://localhost:5000/api/v1`
- 🟢 **API Gateway Health Check**: `http://localhost:5000/health`
- 🐘 **PostgreSQL Database**: `localhost:5432`
- 🔴 **Redis Cache & Queue**: `localhost:6379`

---

## 🗝️ Default Seed Credentials

After running database migrations/seeding (`npm run prisma:seed` in `server`), use these credentials on the Login page:

| User Role | Email | Password | Access Privileges |
| :--- | :--- | :--- | :--- |
| **Demo User** | `user@taskforge.ai` | `UserPassword123!` | View & manage personal tasks |
| **Admin User** | `admin@taskforge.ai` | `AdminPassword123!` | Full system metrics, view & control all workspace tasks |

---

## 📡 API Reference Endpoint Summary

### Authentication Routes (`/api/v1/auth`)
- `POST /api/v1/auth/register`: Create new user account.
- `POST /api/v1/auth/login`: Authenticate credentials & receive Access + Refresh tokens.
- `POST /api/v1/auth/refresh-token`: Refresh Access Token using valid Refresh Token.
- `POST /api/v1/auth/logout`: Revoke Refresh Token & invalidate Redis session.
- `GET /api/v1/auth/me`: Fetch authenticated user profile (`Bearer` token required).

### Task Queue Routes (`/api/v1/tasks`)
- `POST /api/v1/tasks`: Dispatch new background task (Supports scheduling & JSON payload).
- `GET /api/v1/tasks`: Paginated list of tasks (Supports `search`, `status`, `type`, `page`, `limit`, `sortBy`).
- `GET /api/v1/tasks/:id`: Fetch single task details with execution audit logs (`TaskLog`).
- `PATCH /api/v1/tasks/:id`: Update task parameters before processing.
- `DELETE /api/v1/tasks/:id`: Cancel & delete task from database.
- `POST /api/v1/tasks/:id/retry`: Re-queue a `FAILED` task for background worker retry.
- `GET /api/v1/tasks/stats/summary`: Aggregate counts for dashboard metric cards.

---

## 🔄 CI/CD Pipeline & Automated Testing

This repository includes a GitHub Actions Workflow ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) configured to:
1. Spin up isolated PostgreSQL 16 and Redis 7 test containers in GitHub runners.
2. Run backend TypeScript type check (`tsc --noEmit`) and Jest unit test suite (`npm test`).
3. Run Next.js frontend compilation & production build check (`npm run build`).
4. Validate Docker Compose multi-container build integrity.

To run tests locally:
```bash
# Backend unit tests
cd server
npm test

# Backend type check
npx tsc --noEmit

# Frontend production build
cd ../client
npm run build
```
