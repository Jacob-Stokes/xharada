// Set test environment variables BEFORE any imports
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-secret';
process.env.DATABASE_URL = ':memory:';

import { beforeAll, afterAll } from 'vitest';

beforeAll(() => {
  // Environment already set above
});

afterAll(() => {
  // Cleanup if needed
});
