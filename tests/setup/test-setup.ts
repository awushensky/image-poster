import { vi } from 'vitest';

process.env.SESSION_SECRET = 'test-secret-key-for-testing-only';
process.env.NODE_ENV = 'test';

vi.mock('process', () => ({
  env: {
    SESSION_SECRET: 'test-secret-key-for-testing-only',
    NODE_ENV: 'test',
  }
}));
