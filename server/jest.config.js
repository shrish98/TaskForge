const shared = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  verbose: true,
  forceExit: true,
  // OCR downloads its language model on first use, so the first OCR test can take a while.
  testTimeout: 30_000,
  projects: [
    {
      ...shared,
      displayName: 'unit',
      testMatch: ['<rootDir>/src/__tests__/*.test.ts'],
    },
    {
      // Real Postgres and Redis, real BullMQ worker. See src/__tests__/integration/env.ts.
      ...shared,
      displayName: 'integration',
      testMatch: ['<rootDir>/src/__tests__/integration/*.test.ts'],
      setupFiles: ['<rootDir>/src/__tests__/integration/env.ts'],
    },
  ],
};
