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
