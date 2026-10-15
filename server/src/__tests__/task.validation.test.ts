import { createTaskSchema, taskQuerySchema, idempotencyKeySchema } from '../validations/task.validation';
import { registerSchema } from '../validations/auth.validation';

describe('Task Zod Validation Schemas Suite', () => {
  describe('createTaskSchema', () => {
    it('should validate a valid task creation payload', () => {
      const validPayload = {
        title: 'Extract Invoice Text',
        description: 'Run OCR on customer invoice',
        type: 'FILE_PROCESSING',
        priority: 2,
        payload: { imageUrl: 'https://example.com/invoice.png' },
      };

      const result = createTaskSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe(validPayload.title);
        expect(result.data.priority).toBe(2);
      }
    });

    it('should reject titles shorter than 3 characters', () => {
      const result = createTaskSchema.safeParse({ title: 'AB', type: 'REPORT_GENERATION' });
      expect(result.success).toBe(false);
    });

    it.each([
      ['FILE_PROCESSING', {}, 'payload.imageUrl'],
      ['WEB_SCRAPE', { url: 'not a url' }, 'payload.url'],
      ['WEB_SCRAPE', { url: 'ftp://example.com' }, 'payload.url'],
      ['NOTIFICATION_DISPATCH', { data: {} }, 'payload.webhookUrl'],
      ['DATA_EXPORT', { status: 'SOMETIMES' }, 'payload.status'],
    ])('rejects a %s task with payload %j at %s', (type, payload, field) => {
      const result = createTaskSchema.safeParse({ title: 'A task', type, payload });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.map((i) => i.path.join('.'))).toContain(field);
      }
    });

    it('accepts a report task with no payload', () => {
      expect(createTaskSchema.safeParse({ title: 'Monthly report', type: 'REPORT_GENERATION' }).success).toBe(true);
    });
  });

  describe('taskQuerySchema', () => {
    it('should correctly parse query parameter defaults', () => {
      const queryParams = {
        search: 'invoice',
        status: 'PROCESSING',
        page: '2',
        limit: '20',
      };

      const result = taskQuerySchema.safeParse(queryParams);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(20);
        expect(result.data.status).toBe('PROCESSING');
      }
    });
  });

  describe('idempotencyKeySchema', () => {
    it('accepts UUIDs and rejects short or odd keys', () => {
      expect(idempotencyKeySchema.safeParse('3f2b8a9e-7c41-4d1a-9e0b-5a6c7d8e9f10').success).toBe(true);
      expect(idempotencyKeySchema.safeParse('short').success).toBe(false);
      expect(idempotencyKeySchema.safeParse('has spaces in it').success).toBe(false);
    });
  });

  describe('registerSchema', () => {
    it('drops a role sent by the client, so nobody can sign themselves up as ADMIN', () => {
      const result = registerSchema.parse({ email: 'a@b.co', password: 'longenough', name: 'Al', role: 'ADMIN' });
      expect(result).not.toHaveProperty('role');
    });
  });
});
