import PDFDocument from 'pdfkit';
import { TaskStatus, TaskType } from '@prisma/client';
import { prisma } from '../config/db.js';
import { summarise, taskDurations } from '../lib/stats.js';
import { JobHandler } from './types.js';

const STATUSES = Object.values(TaskStatus);
const TYPES = Object.values(TaskType);
const RECENT_ROWS = 25;

const formatMs = (ms: number | null) => (ms === null ? '-' : ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`);

function renderPdf(build: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48, info: { Title: 'TaskForge activity report' } });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    build(doc);
    doc.end();
  });
}

function row(doc: PDFKit.PDFDocument, cells: string[], widths: number[], bold = false) {
  const y = doc.y;
  let x = doc.page.margins.left;
  doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9);
  cells.forEach((cell, i) => {
    doc.text(cell, x, y, { width: widths[i] - 6, lineBreak: false, ellipsis: true });
    x += widths[i];
  });
  doc.moveDown(0.5);
  doc.x = doc.page.margins.left;
}

/** Builds a PDF summary of the task owner's own tasks, straight from the database. */
export const runReport: JobHandler = async (ctx) => {
  await ctx.progress(15, 'Loading task history');
  const [user, tasks] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: ctx.userId }, select: { name: true, email: true } }),
    prisma.task.findMany({
      where: { userId: ctx.userId },
      orderBy: { createdAt: 'desc' },
      take: 1000,
      select: {
        id: true, title: true, type: true, status: true, attempts: true,
        createdAt: true, scheduledAt: true, startedAt: true, completedAt: true,
      },
    }),
  ]);

  await ctx.progress(45, `Aggregating ${tasks.length} tasks`);
  const withTimes = tasks.map((t) => ({ ...t, ...taskDurations(t) }));
  const byStatus = STATUSES.map((s) => [s, tasks.filter((t) => t.status === s).length] as const);
  const byType = TYPES.map((type) => {
    const ofType = withTimes.filter((t) => t.type === type);
    const run = summarise(ofType.map((t) => t.runMs).filter((v): v is number => v !== null));
    return { type, total: ofType.length, completed: ofType.filter((t) => t.status === 'COMPLETED').length, run };
  });
  const wait = summarise(withTimes.map((t) => t.waitMs).filter((v): v is number => v !== null));

  await ctx.progress(70, 'Rendering PDF');
  const generatedAt = new Date();
  const pdf = await renderPdf((doc) => {
    doc.font('Helvetica-Bold').fontSize(20).text('TaskForge activity report');
    doc.font('Helvetica').fontSize(10).fillColor('#555')
      .text(`${user.name} <${user.email}> · generated ${generatedAt.toUTCString()}`)
      .text(`Covers your ${tasks.length} most recent tasks.`);
    doc.fillColor('#000').moveDown();

    doc.font('Helvetica-Bold').fontSize(13).text('By status');
    doc.moveDown(0.3);
    byStatus.forEach(([status, count]) => row(doc, [status, String(count)], [140, 80]));
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(9).fillColor('#555')
      .text(`Queue wait: mean ${formatMs(wait.meanMs)}, p95 ${formatMs(wait.p95Ms)} across ${wait.count} started tasks.`);
    doc.fillColor('#000').moveDown();

    doc.font('Helvetica-Bold').fontSize(13).text('By job type');
    doc.moveDown(0.3);
    const typeWidths = [150, 60, 80, 90, 90];
    row(doc, ['Type', 'Tasks', 'Completed', 'Mean run', 'p95 run'], typeWidths, true);
    byType.forEach((t) =>
      row(doc, [t.type, String(t.total), String(t.completed), formatMs(t.run.meanMs), formatMs(t.run.p95Ms)], typeWidths),
    );
    doc.moveDown();

    doc.font('Helvetica-Bold').fontSize(13).text(`Most recent ${Math.min(RECENT_ROWS, tasks.length)} tasks`);
    doc.moveDown(0.3);
    const recentWidths = [180, 115, 80, 50, 70];
    row(doc, ['Title', 'Type', 'Status', 'Tries', 'Run time'], recentWidths, true);
    withTimes.slice(0, RECENT_ROWS).forEach((t) =>
      row(doc, [t.title, t.type, t.status, String(t.attempts), formatMs(t.runMs)], recentWidths),
    );
  });

  await ctx.progress(95, `PDF is ${(pdf.length / 1024).toFixed(1)} KB`);
  const fileName = `taskforge-report-${generatedAt.toISOString().slice(0, 10)}.pdf`;
  return {
    output: { tasksCovered: tasks.length, byStatus: Object.fromEntries(byStatus), artifact: { fileName, size: pdf.length } },
    message: `Report generated from ${tasks.length} tasks (${(pdf.length / 1024).toFixed(1)} KB PDF).`,
    artifact: { fileName, mimeType: 'application/pdf', data: pdf },
  };
};
