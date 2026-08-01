import { createTaskSchema, updateTaskSchema, taskQuerySchema } from '../validations/task.validation';

describe('Task Zod Validation Schemas Suite', () => {
  describe('createTaskSchema', () => {
    it('should validate a valid task creation payload', () => {
      const validPayload = {
        title: 'Extract Invoice PDF Metadata',
        description: 'Run OCR on customer invoice',
        type: 'FILE_PROCESSING',
        priority: 2,
        payload: { fileUrl: 'https://example.com/inv.pdf' },
      };

      const result = createTaskSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe(validPayload.title);
        expect(result.data.priority).toBe(2);
      }
    });

    it('should reject titles shorter than 3 characters', () => {
      const invalidPayload = {
        title: 'AB',
      };

      const result = createTaskSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
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
});
