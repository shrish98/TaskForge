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
    return res.data.data;
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
};
