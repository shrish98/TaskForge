import { api } from '../lib/api';

export type TaskStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type TaskType =
  | 'FILE_PROCESSING'
  | 'DATA_EXPORT'
  | 'REPORT_GENERATION'
  | 'WEB_SCRAPE'
  | 'NOTIFICATION_DISPATCH';

export interface TaskLog {
  id: string;
  taskId: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  message: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  type: TaskType;
  status: TaskStatus;
  priority: number;
  payload?: any;
  result?: any;
  error?: string;
  attempts: number;
  maxAttempts: number;
  progress: number;
  scheduledAt?: string;
  completedAt?: string;
  failedAt?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  taskLogs?: TaskLog[];
}

export interface TaskQueryOptions {
  search?: string;
  status?: TaskStatus;
  type?: TaskType;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedTasksResponse {
  tasks: Task[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface TaskStatsSummary {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  type?: TaskType;
  priority?: number;
  payload?: any;
  scheduledAt?: string;
}

export const taskService = {
  async getTasks(options: TaskQueryOptions = {}): Promise<PaginatedTasksResponse> {
    const params: any = {};
    if (options.search) params.search = options.search;
    if (options.status) params.status = options.status;
    if (options.type) params.type = options.type;
    if (options.page) params.page = options.page;
    if (options.limit) params.limit = options.limit;
    if (options.sortBy) params.sortBy = options.sortBy;
    if (options.sortOrder) params.sortOrder = options.sortOrder;

    const res = await api.get('/tasks', { params });
    const responseData = res.data.data;
    return {
      tasks: responseData?.data || (Array.isArray(responseData) ? responseData : []),
      pagination: responseData?.meta || { total: 0, page: 1, limit: 10, totalPages: 1 },
    };
  },

  async getTaskById(taskId: string): Promise<Task> {
    const res = await api.get(`/tasks/${taskId}`);
    return res.data.data;
  },

  async createTask(payload: CreateTaskPayload): Promise<Task> {
    const res = await api.post('/tasks', payload);
    return res.data.data;
  },

  async updateTask(taskId: string, payload: Partial<CreateTaskPayload>): Promise<Task> {
    const res = await api.patch(`/tasks/${taskId}`, payload);
    return res.data.data;
  },

  async deleteTask(taskId: string): Promise<void> {
    await api.delete(`/tasks/${taskId}`);
  },

  async retryTask(taskId: string): Promise<Task> {
    const res = await api.post(`/tasks/${taskId}/retry`);
    return res.data.data;
  },

  async getStatsSummary(): Promise<TaskStatsSummary> {
    const res = await api.get('/tasks/stats/summary');
    return res.data.data;
  },

  async getSystemMetrics(): Promise<SystemMetrics> {
    const res = await api.get('/system/metrics');
    return res.data.data;
  },

  /** Fetches a task's file with the auth header and hands it to the browser as a download. */
  async downloadArtifact(taskId: string, fallbackName: string): Promise<void> {
    const res = await api.get(`/tasks/${taskId}/artifact`, { responseType: 'blob' });
    const match = /filename="([^"]+)"/.exec(res.headers['content-disposition'] ?? '');
    const url = URL.createObjectURL(res.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = match?.[1] ?? fallbackName;
    link.click();
    URL.revokeObjectURL(url);
  },
};

interface Timing {
  count: number;
  meanMs: number | null;
  p50Ms: number | null;
  p95Ms: number | null;
}

export interface SystemMetrics {
  queue: { waiting: number; active: number; delayed: number; completedRetained: number; failedRetained: number; deadLetter: number };
  workers: { online: number; names: string[] } | null;
  throughput: { completedLastHour: number; failedLastHour: number };
  timings: { sampleSize: number; queueWait: Timing; run: Timing; runByType: Record<TaskType, Timing> };
  redis: {
    version?: string | null;
    usedMemory?: string | null;
    maxMemoryPolicy?: string | null;
    connectedClients?: number | null;
    opsPerSec?: number;
    aofEnabled?: boolean;
    roundTripMs: number | null;
  };
  measuredAt: string;
}

/** What each job type does, and a payload that works for it, for the create-task form. */
export const TASK_TYPES: Record<TaskType, { label: string; summary: string; example: Record<string, unknown> }> = {
  FILE_PROCESSING: {
    label: 'OCR (image to text)',
    summary: 'Downloads an image and reads its text with Tesseract.',
    example: { imageUrl: 'https://tesseract.projectnaptha.com/img/eng_bw.png' },
  },
  WEB_SCRAPE: {
    label: 'Web scrape',
    summary: 'Fetches a page and extracts its title, headings, links and any CSS selector you give.',
    example: { url: 'https://en.wikipedia.org/wiki/Message_queue', selector: 'h2' },
  },
  REPORT_GENERATION: {
    label: 'PDF report',
    summary: 'Builds a PDF summary of your tasks: counts, run times and recent history.',
    example: {},
  },
  DATA_EXPORT: {
    label: 'CSV export',
    summary: 'Exports your tasks as a CSV file. Optionally filter by status.',
    example: { status: 'COMPLETED' },
  },
  NOTIFICATION_DISPATCH: {
    label: 'Webhook',
    summary: 'POSTs a signed JSON event to a URL. Retries on 5xx and timeouts.',
    example: { webhookUrl: 'https://httpbin.org/post', data: { hello: 'world' } },
  },
};
