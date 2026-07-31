import { Job } from 'bullmq';
import { TaskJobData } from './task.queue.js';

export interface ProcessingResult {
  success: boolean;
  output: any;
  message: string;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class TaskProcessor {
  static async processJob(job: Job<TaskJobData>): Promise<ProcessingResult> {
    const { taskId, type, payload } = job.data;

    await job.updateProgress(10);
    await delay(1000);

    switch (type) {
      case 'FILE_PROCESSING':
        return this.processFileProcessing(job);

      case 'WEB_SCRAPE':
        return this.processWebScrape(job);

      case 'REPORT_GENERATION':
        return this.processReportGeneration(job);

      case 'DATA_EXPORT':
        return this.processDataExport(job);

      case 'NOTIFICATION_DISPATCH':
        return this.processNotificationDispatch(job);

      default:
        return this.processDefaultTask(job);
    }
  }

  private static async processFileProcessing(job: Job<TaskJobData>): Promise<ProcessingResult> {
    const fileName = job.data.payload?.fileName || 'document.pdf';

    await job.updateProgress(30);
    await delay(1500);

    await job.updateProgress(65);
    await delay(1500);

    await job.updateProgress(90);
    await delay(1000);

    return {
      success: true,
      output: {
        fileName,
        pagesProcessed: 14,
        extractedTextLength: 4820,
        ocrConfidence: '98.5%',
        summary: 'Extracted invoices, dates, customer details, and total line items.',
      },
      message: 'File processing & OCR text extraction completed successfully.',
    };
  }

  private static async processWebScrape(job: Job<TaskJobData>): Promise<ProcessingResult> {
    const url = job.data.payload?.targetUrl || 'https://example.com/products';

    await job.updateProgress(25);
    await delay(1200);

    await job.updateProgress(50);
    await delay(1500);

    await job.updateProgress(85);
    await delay(1200);

    return {
      success: true,
      output: {
        scrapedUrl: url,
        itemsExtracted: 340,
        priceChangesFound: 18,
        stockStatus: 'In Stock',
        scrapedAt: new Date().toISOString(),
      },
      message: 'Web scraping and catalog indexing completed.',
    };
  }

  private static async processReportGeneration(job: Job<TaskJobData>): Promise<ProcessingResult> {
    await job.updateProgress(40);
    await delay(1500);

    await job.updateProgress(80);
    await delay(1500);

    return {
      success: true,
      output: {
        reportName: 'Q2_Financial_Summary.pdf',
        fileSize: '4.2 MB',
        downloadUrl: '/downloads/reports/Q2_Financial_Summary.pdf',
        generatedAt: new Date().toISOString(),
      },
      message: 'Quarterly financial report PDF generated.',
    };
  }

  private static async processDataExport(job: Job<TaskJobData>): Promise<ProcessingResult> {
    await job.updateProgress(50);
    await delay(1500);

    return {
      success: true,
      output: {
        exportFormat: 'CSV',
        recordsExported: 12500,
        downloadUrl: '/exports/data_export_2026.csv',
      },
      message: 'Data export file generated successfully.',
    };
  }

  private static async processNotificationDispatch(job: Job<TaskJobData>): Promise<ProcessingResult> {
    await job.updateProgress(35);
    await delay(1000);

    // Simulate intentional failure test if payload requests error testing
    if (job.data.payload?.forceError) {
      throw new Error('SMTP Gateway Timeout: Failed to establish TLS handshake with mail server.');
    }

    await job.updateProgress(85);
    await delay(1200);

    return {
      success: true,
      output: {
        emailsSent: 1500,
        deliveryRate: '99.8%',
        bounced: 3,
      },
      message: 'Batch email notifications dispatched successfully.',
    };
  }

  private static async processDefaultTask(job: Job<TaskJobData>): Promise<ProcessingResult> {
    await job.updateProgress(50);
    await delay(1500);

    await job.updateProgress(90);
    await delay(1000);

    return {
      success: true,
      output: {
        processedPayload: job.data.payload,
        completedAt: new Date().toISOString(),
      },
      message: 'Generic asynchronous background task executed.',
    };
  }
}
