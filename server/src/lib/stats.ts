export function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, index)];
}

/** Mean, median and p95 of a list of durations in milliseconds. */
export function summarise(values: number[]) {
  const sorted = values.filter((v) => Number.isFinite(v) && v >= 0).sort((a, b) => a - b);
  if (sorted.length === 0) return { count: 0, meanMs: null, p50Ms: null, p95Ms: null };
  const mean = sorted.reduce((sum, v) => sum + v, 0) / sorted.length;
  return {
    count: sorted.length,
    meanMs: Math.round(mean),
    p50Ms: percentile(sorted, 50),
    p95Ms: percentile(sorted, 95),
  };
}

interface TimedTask {
  createdAt: Date;
  scheduledAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
}

/** Time a task spent waiting in the queue (from when it was due) and running on a worker. */
export function taskDurations(task: TimedTask) {
  const due = task.scheduledAt && task.scheduledAt > task.createdAt ? task.scheduledAt : task.createdAt;
  return {
    waitMs: task.startedAt ? task.startedAt.getTime() - due.getTime() : null,
    runMs: task.startedAt && task.completedAt ? task.completedAt.getTime() - task.startedAt.getTime() : null,
  };
}
