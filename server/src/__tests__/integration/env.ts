// Runs before every integration test file, before any app module reads process.env.
// These tests wipe the database and the queues, so they refuse to run unless pointed at a
// throwaway database whose name says "test", and a Redis database other than 0.

const db = process.env.TEST_DATABASE_URL;
const redis = process.env.TEST_REDIS_URL;

if (!db || !/test/i.test(new URL(db).pathname)) {
  throw new Error('Set TEST_DATABASE_URL to a throwaway Postgres database with "test" in its name. These tests wipe it.');
}
if (!redis || !/\/([1-9]|1[0-5])$/.test(new URL(redis).pathname)) {
  throw new Error('Set TEST_REDIS_URL to a Redis URL with a database number 1-15, e.g. redis://localhost:6379/1. These tests flush it.');
}

process.env.DATABASE_URL = db;
process.env.REDIS_URL = redis;
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'integration-test-access-secret';
process.env.JWT_REFRESH_SECRET = 'integration-test-refresh-secret';
// Jobs fetch from a fixture server on localhost, which the SSRF guard blocks otherwise.
process.env.ALLOW_PRIVATE_URLS = 'true';
// Retries back off 50 ms, 100 ms instead of 2 s, 4 s.
process.env.JOB_BACKOFF_MS = '50';
process.env.API_RATE_LIMIT = '100000';
process.env.WEBHOOK_SIGNING_SECRET = 'integration-test-webhook-secret';
