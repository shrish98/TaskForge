import { Role, TaskType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';
import { redis } from '../config/redis.js';
import { taskQueue } from '../queues/task.queue.js';
import { deadLetterQueue } from '../queues/deadLetter.queue.js';
import { closeTaskEvents } from '../events/taskEvents.js';
import { CreateTaskData } from '../repositories/task.repository.js';
import { taskService } from '../services/task.service.js';

async function main() {
  console.log('🌱 Starting database seed script...');

  // Clean existing data
  await taskQueue.obliterate({ force: true });
  await deadLetterQueue.obliterate({ force: true });
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
      email: 'admin@taskforge.ai',
      passwordHash: adminPasswordHash,
      name: 'System Administrator',
      role: Role.ADMIN,
    },
  });

  const demoUser = await prisma.user.create({
    data: {
      email: 'user@taskforge.ai',
      passwordHash: userPasswordHash,
      name: 'Demo SaaS User',
      role: Role.USER,
    },
  });

  console.log(`👤 Created Users: ${adminUser.email} (ADMIN), ${demoUser.email} (USER)`);

  // Demo tasks go through the real service, so they are queued and run by the worker like any
  // other task. They need Redis, and a worker running, to make progress.
  const demoTasks: CreateTaskData[] = [
    {
      title: 'Scrape a Wikipedia article',
      description: 'Fetch the page and pull out the title, headings and links.',
      type: TaskType.WEB_SCRAPE,
      priority: 2,
      payload: { url: 'https://en.wikipedia.org/wiki/Message_queue', selector: 'h2' },
      userId: demoUser.id,
    },
    {
      title: 'OCR a scanned paragraph',
      description: 'Download a sample image and read its text with Tesseract.',
      type: TaskType.FILE_PROCESSING,
      priority: 1,
      payload: { imageUrl: 'https://tesseract.projectnaptha.com/img/eng_bw.png' },
      userId: demoUser.id,
    },
    {
      title: 'Send a signed webhook',
      description: 'POST a JSON event to httpbin, which echoes it back.',
      type: TaskType.NOTIFICATION_DISPATCH,
      priority: 1,
      payload: { webhookUrl: 'https://httpbin.org/post', data: { hello: 'from TaskForge' } },
      userId: demoUser.id,
    },
    {
      title: 'Activity report (PDF)',
      type: TaskType.REPORT_GENERATION,
      priority: 1,
      payload: {},
      userId: demoUser.id,
    },
  ];
  for (const task of demoTasks) await taskService.createTask(task);

  console.log(`📥 Queued ${demoTasks.length} demo tasks`);

  console.log('✅ Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Database seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await Promise.all([taskQueue.close(), deadLetterQueue.close(), closeTaskEvents(), redis.quit()]);
    await prisma.$disconnect();
  });
