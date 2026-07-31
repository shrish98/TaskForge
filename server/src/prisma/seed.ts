import { PrismaClient, Role, TaskStatus, TaskType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed script...');

  // Clean existing data
  await prisma.taskLog.deleteMany();
  await prisma.task.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleaned existing database records.');

  // Create password hashes
  const adminPasswordHash = await bcrypt.hash('AdminPassword123!', 10);
  const userPasswordHash = await bcrypt.hash('UserPassword123!', 10);

  // Seed Users
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@saarthi.ai',
      passwordHash: adminPasswordHash,
      name: 'System Administrator',
      role: Role.ADMIN,
    },
  });

  const demoUser = await prisma.user.create({
    data: {
      email: 'user@saarthi.ai',
      passwordHash: userPasswordHash,
      name: 'Demo SaaS User',
      role: Role.USER,
    },
  });

  console.log(`👤 Created Users: ${adminUser.email} (ADMIN), ${demoUser.email} (USER)`);

  // Seed Demo Tasks
  const task1 = await prisma.task.create({
    data: {
      title: 'Extract Text & Metadata from Invoice PDF',
      description: 'Extract customer address, total amount, line items, and invoice number using OCR.',
      type: TaskType.FILE_PROCESSING,
      status: TaskStatus.COMPLETED,
      priority: 3,
      progress: 100,
      payload: { fileName: 'invoice_2026_07.pdf', fileSizeMB: 2.4, fileType: 'application/pdf' },
      result: { extractedAmount: '$1,450.00', invoiceNumber: 'INV-99201', vendor: 'Acme SaaS Corp' },
      attempts: 1,
      maxAttempts: 3,
      userId: demoUser.id,
      completedAt: new Date(),
    },
  });

  await prisma.taskLog.createMany({
    data: [
      { taskId: task1.id, level: 'INFO', message: 'Job queued into Redis BullMQ engine.' },
      { taskId: task1.id, level: 'INFO', message: 'Worker picked up invoice PDF processing.' },
      { taskId: task1.id, level: 'INFO', message: 'OCR text extraction finished successfully (100%).' },
    ],
  });

  const task2 = await prisma.task.create({
    data: {
      title: 'Scrape E-Commerce Competitor Price Catalog',
      description: 'Crawl product listing pages for price fluctuations and stock updates.',
      type: TaskType.WEB_SCRAPE,
      status: TaskStatus.PROCESSING,
      priority: 2,
      progress: 65,
      payload: { targetUrl: 'https://example-shop.com/catalog', maxPages: 50 },
      attempts: 1,
      maxAttempts: 3,
      userId: demoUser.id,
    },
  });

  await prisma.taskLog.createMany({
    data: [
      { taskId: task2.id, level: 'INFO', message: 'Scraper task initialized by worker.' },
      { taskId: task2.id, level: 'INFO', message: 'Parsed pages 1-32. Extracted 420 items (65%).' },
    ],
  });

  const task3 = await prisma.task.create({
    data: {
      title: 'Generate Quarterly Financial PDF Report',
      description: 'Aggregate revenue metrics, server cost projections, and active subscriptions.',
      type: TaskType.REPORT_GENERATION,
      status: TaskStatus.PENDING,
      priority: 1,
      progress: 0,
      payload: { format: 'PDF', includeCharts: true, period: 'Q2-2026' },
      attempts: 0,
      maxAttempts: 3,
      userId: demoUser.id,
    },
  });

  await prisma.taskLog.create({
    data: { taskId: task3.id, level: 'INFO', message: 'Task queued. Awaiting available worker thread.' },
  });

  const task4 = await prisma.task.create({
    data: {
      title: 'Dispatch Batch Email Notifications to Subscribed Clients',
      description: 'Send security digest emails to all registered tier-1 workspace users.',
      type: TaskType.NOTIFICATION_DISPATCH,
      status: TaskStatus.FAILED,
      priority: 2,
      progress: 25,
      payload: { recipientCount: 1500, templateId: 'sec_digest_v2' },
      error: 'SMTP Gateway Timeout: Connection failed to mail server at port 587.',
      attempts: 3,
      maxAttempts: 3,
      userId: demoUser.id,
      failedAt: new Date(),
    },
  });

  await prisma.taskLog.createMany({
    data: [
      { taskId: task4.id, level: 'INFO', message: 'Dispatching email batch 1/15...' },
      { taskId: task4.id, level: 'ERROR', message: 'Connection timed out to SMTP gateway on attempt 3.' },
      { taskId: task4.id, level: 'ERROR', message: 'Task reached maxAttempts limit (3). Marked as FAILED.' },
    ],
  });

  console.log('✅ Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Database seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
