import { TaskType } from '@prisma/client';
import { runOcr } from './ocr.js';
import { runScrape } from './scrape.js';
import { runReport } from './report.js';
import { runCsvExport } from './csvExport.js';
import { runWebhook } from './webhook.js';
import { JobHandler } from './types.js';

export const jobHandlers: Record<TaskType, JobHandler> = {
  FILE_PROCESSING: runOcr,
  WEB_SCRAPE: runScrape,
  REPORT_GENERATION: runReport,
  DATA_EXPORT: runCsvExport,
  NOTIFICATION_DISPATCH: runWebhook,
};

/**
 * How long one attempt of each type may run before it is aborted and counted as a failed
 * attempt. Network calls have their own shorter timeouts; this catches everything else (a hung
 * OCR run, a query that never returns), which would otherwise hold a worker slot forever.
 */
export const jobTimeoutsMs: Record<TaskType, number> = {
  FILE_PROCESSING: 120_000,
  WEB_SCRAPE: 60_000,
  REPORT_GENERATION: 60_000,
  DATA_EXPORT: 60_000,
  NOTIFICATION_DISPATCH: 30_000,
};
