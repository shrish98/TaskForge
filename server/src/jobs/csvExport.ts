import { Prisma } from '@prisma/client';
import { prisma } from '../config/db.js';
import { taskDurations } from '../lib/stats.js';
import { JobHandler } from './types.js';

const MAX_ROWS = 10_000;
const BATCH = 500;

const COLUMNS = [
  'id', 'title', 'type', 'status', 'priority', 'attempts', 'progress',
  'createdAt', 'startedAt', 'completedAt', 'failedAt', 'runMs', 'error',
] as const;

/** RFC 4180 quoting, plus a guard against spreadsheet formula injection. */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let text = value instanceof Date ? value.toISOString() : String(value);
  // Excel and Sheets run cells starting with = + - @ as formulas, so a task titled
  // "=HYPERLINK(...)" would execute when the export is opened. Prefix them with a quote.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export const toCsvLine = (cells: unknown[]) => cells.map(csvCell).join(',');

/** Exports the owner's tasks as CSV, reading in batches so a large history doesn't load at once. */
export const runCsvExport: JobHandler = async (ctx) => {
  const where: Prisma.TaskWhereInput = {
    userId: ctx.userId,
    ...(ctx.payload.status ? { status: ctx.payload.status } : {}),
  };
  const total = Math.min(await prisma.task.count({ where }), MAX_ROWS);
  await ctx.progress(10, `Exporting ${total} tasks`);

  const lines = [toCsvLine([...COLUMNS])];
  let cursor: string | undefined;
  while (lines.length - 1 < total) {
    const batch = await prisma.task.findMany({
      where,
      orderBy: { id: 'asc' },
      take: Math.min(BATCH, total - (lines.length - 1)),
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    if (batch.length === 0) break;
    for (const t of batch) {
      lines.push(toCsvLine([
        t.id, t.title, t.type, t.status, t.priority, t.attempts, t.progress,
        t.createdAt, t.startedAt, t.completedAt, t.failedAt, taskDurations(t).runMs, t.error,
      ]));
    }
    cursor = batch[batch.length - 1].id;
    await ctx.progress(10 + Math.round((80 * (lines.length - 1)) / Math.max(total, 1)), `Wrote ${lines.length - 1} of ${total} rows`);
  }

  const csv = Buffer.from(`${lines.join('\r\n')}\r\n`, 'utf8');
  const fileName = `taskforge-tasks-${new Date().toISOString().slice(0, 10)}.csv`;
  return {
    output: { rows: lines.length - 1, filter: ctx.payload.status ?? 'ALL', artifact: { fileName, size: csv.length } },
    message: `Exported ${lines.length - 1} tasks to CSV (${(csv.length / 1024).toFixed(1)} KB).`,
    artifact: { fileName, mimeType: 'text/csv; charset=utf-8', data: csv },
  };
};
