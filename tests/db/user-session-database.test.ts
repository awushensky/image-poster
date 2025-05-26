import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  setupTestDatabase,
  teardownTestDatabase,
  getTestDatabase,
} from '../setup/database-test-setup';
import type { NodeSavedSession } from '@atproto/oauth-client-node';
import {
  createUserSession,
  getUserFromSession,
  deleteSessionByToken,
  storeOAuthSession,
  getOAuthSession,
  deleteOAuthSession
} from '../../app/db/user-session-database.server';

vi.mock('../../app/db/database.server', () => ({
  ensureDatabase: vi.fn(() => getTestDatabase())
}));

vi.mock('crypto', () => ({
  createHmac: vi.fn(() => ({
    update: vi.fn(() => ({
      digest: vi.fn(() => 'mocked-session-token-12345')
    }))
  }))
}));

describe('User Session Database Operations', () => {
  const testUserDid = 'did:plc:user123';
  const testUserDid2 = 'did:web:user456';

  beforeEach(async () => {
    await setupTestDatabase();

    const db = getTestDatabase();
    await db.run('INSERT INTO users (did) VALUES (?)', [testUserDid]);
    await db.run('INSERT INTO users (did) VALUES (?)', [testUserDid2]);
  });

  afterEach(async () => {
    await teardownTestDatabase();
  });

  const createMockOAuthSession = (userDid: `did:plc:${string}` | `did:web:${string}`): NodeSavedSession => ({
    dpopJwk: {
      kty: 'EC',
      crv: 'P-256',
      x: 'test-x-value',
      y: 'test-y-value',
      d: 'test-d-value'
    },

    tokenSet: {
      access_token: 'at_test_access_token_12345',
      token_type: 'DPoP',
      expires_at: (Date.now() + 3600000).toString(),
      refresh_token: 'rt_test_refresh_token_67890',
      scope: 'atproto transition:generic',
      iss: 'https://bsky.social',
      sub: userDid,
      aud: 'http://localhost:3000/client-metadata.json',
    }
  });

  describe('OAuth Session Management', () => {
    const mockOAuthSession = createMockOAuthSession(testUserDid);

    describe('storeOAuthSession', () => {
      it('should store OAuth session for new user', async () => {
        await storeOAuthSession(testUserDid, mockOAuthSession);

        const db = getTestDatabase();
        const session = await db.get(
          'SELECT * FROM user_sessions WHERE user_did = ?',
          [testUserDid]
        );

        expect(session).toBeDefined();
        expect(session.user_did).toBe(testUserDid);
        expect(session.session_token).toBe('mocked-session-token-12345');
        expect(JSON.parse(session.session_data)).toEqual(mockOAuthSession);
      });

      it('should update OAuth session for existing user', async () => {
        // Store initial session
        await storeOAuthSession(testUserDid, mockOAuthSession);

        // Update with new session data
        const updatedSession: NodeSavedSession = {
          ...mockOAuthSession,
          tokenSet: {
            ...mockOAuthSession.tokenSet,
            access_token: 'at_new_access_token_54321'
          }
        };
        await storeOAuthSession(testUserDid, updatedSession);

        const storedSession = await getOAuthSession(testUserDid);
        expect(storedSession?.tokenSet.access_token).toBe('at_new_access_token_54321');

        // Should still be only one session record
        const db = getTestDatabase();
        const sessions = await db.all('SELECT * FROM user_sessions WHERE user_did = ?', [testUserDid]);
        expect(sessions).toHaveLength(1);
      });

      it('should handle concurrent session storage', async () => {
        const sessions: NodeSavedSession[] = Array(3).fill(null).map((_, i) => ({
          ...mockOAuthSession,
          tokenSet: {
            ...mockOAuthSession.tokenSet,
            access_token: `at_token_${i}`
          }
        }));

        // Store sessions concurrently
        await Promise.all(
          sessions.map(session => storeOAuthSession(testUserDid, session))
        );

        // Should only have one session (last one wins)
        const db = getTestDatabase();
        const storedSessions = await db.all('SELECT * FROM user_sessions WHERE user_did = ?', [testUserDid]);
        expect(storedSessions).toHaveLength(1);
      });

      it('should throw error for non-existent user', async () => {
        // This test depends on whether your createOrUpdateUser creates users automatically
        // If it creates users, this test would need to be modified
        await expect(
          storeOAuthSession('did:nonexistent:user', mockOAuthSession)
        ).rejects.toThrow();
      });
    });

    describe('getOAuthSession', () => {
      it('should retrieve stored OAuth session', async () => {
        await storeOAuthSession(testUserDid, mockOAuthSession);

        const retrieved = await getOAuthSession(testUserDid);

        expect(retrieved).toEqual(mockOAuthSession);
      });

      it('should return undefined for non-existent session', async () => {
        const result = await getOAuthSession('did:nonexistent:user');
        expect(result).toBeUndefined();
      });

      it('should return undefined for user with no session', async () => {
        const result = await getOAuthSession(testUserDid);
        expect(result).toBeUndefined();
      });

      it('should handle JSON parsing correctly', async () => {
        // For testing complex JSON parsing, we'll use 'any' type to add extra test data
        const complexSession: any = {
          ...mockOAuthSession,
          // Add test metadata that might exist in extended implementations
          _testMetadata: {
            nested: { value: 'test' },
            array: [1, 2, 3],
            boolean: true,
            null: null
          }
        };

        await storeOAuthSession(testUserDid, complexSession);
        const retrieved = await getOAuthSession(testUserDid);

        expect(retrieved).toEqual(complexSession);
        expect((retrieved as any)?._testMetadata.nested.value).toBe('test');
        expect((retrieved as any)?._testMetadata.array).toEqual([1, 2, 3]);
      });
    });

    describe('deleteOAuthSession', () => {
      it('should delete OAuth session for user', async () => {
        await storeOAuthSession(testUserDid, mockOAuthSession);

        // Verify session exists
        const beforeDelete = await getOAuthSession(testUserDid);
        expect(beforeDelete).toBeDefined();

        await deleteOAuthSession(testUserDid);

        // Verify session is gone
        const afterDelete = await getOAuthSession(testUserDid);
        expect(afterDelete).toBeUndefined();
      });

      it('should not affect other users sessions', async () => {
        const session2 = createMockOAuthSession(testUserDid2);

        await storeOAuthSession(testUserDid, mockOAuthSession);
        await storeOAuthSession(testUserDid2, session2);

        await deleteOAuthSession(testUserDid);

        // User1 session should be gone
        const user1Session = await getOAuthSession(testUserDid);
        expect(user1Session).toBeUndefined();

        // User2 session should still exist
        const user2Session = await getOAuthSession(testUserDid2);
        expect(user2Session).toBeDefined();
      });

      it('should handle deleting non-existent session gracefully', async () => {
        // Should not throw error
        await expect(deleteOAuthSession('did:nonexistent:user')).resolves.not.toThrow();
      });
    });
  });

  describe('User Session Management', () => {
    const mockOAuthSession = createMockOAuthSession(testUserDid);

    describe('createUserSession', () => {
      it('should create user session when OAuth session exists', async () => {
        // Store OAuth session first
        await storeOAuthSession(testUserDid, mockOAuthSession);

        const sessionToken = await createUserSession(testUserDid);

        expect(sessionToken).toBe('mocked-session-token-12345');

        // Verify session was stored
        const db = getTestDatabase();
        const session = await db.get(
          'SELECT * FROM user_sessions WHERE session_token = ?',
          [sessionToken]
        );

        expect(session).toBeDefined();
        expect(session.user_did).toBe(testUserDid);
        expect(JSON.parse(session.session_data)).toEqual(mockOAuthSession);
      });

      it('should throw error when no OAuth session exists', async () => {
        await expect(createUserSession(testUserDid))
          .rejects.toThrow('No OAuth session found for user');
      });

      it('should update existing session token', async () => {
        await storeOAuthSession(testUserDid, mockOAuthSession);

        // Create first session
        const token1 = await createUserSession(testUserDid);

        // Create second session (should replace first)
        const token2 = await createUserSession(testUserDid);

        expect(token1).toBe(token2); // Same user generates same token

        // Should only have one session
        const db = getTestDatabase();
        const sessions = await db.all('SELECT * FROM user_sessions WHERE user_did = ?', [testUserDid]);
        expect(sessions).toHaveLength(1);
      });

      it('should create user if user does not exist', async () => {
        const newUserDid = 'did:web:newuser';
        const newUserSession = createMockOAuthSession(newUserDid);

        // Store OAuth session for new user
        await storeOAuthSession(newUserDid, newUserSession);

        const sessionToken = await createUserSession(newUserDid);

        expect(sessionToken).toBeDefined();

        // Verify user was created
        const db = getTestDatabase();
        const user = await db.get('SELECT * FROM users WHERE did = ?', [newUserDid]);
        expect(user).toBeDefined();
        expect(user.did).toBe(newUserDid);
      });
    });

    describe('getUserFromSession', () => {
      it('should retrieve user from valid session token', async () => {
        await storeOAuthSession(testUserDid, mockOAuthSession);
        const sessionToken = await createUserSession(testUserDid);

        const user = await getUserFromSession(sessionToken);

        expect(user).toBeDefined();
        expect(user?.did).toBe(testUserDid);
        expect(user?.created_at).toBeDefined();
        expect(user?.last_login).toBeDefined();
      });

      it('should return undefined for invalid session token', async () => {
        const user = await getUserFromSession('invalid-token');
        expect(user).toBeUndefined();
      });

      it('should update last_used_at when retrieving user', async () => {
        await storeOAuthSession(testUserDid, mockOAuthSession);
        const sessionToken = await createUserSession(testUserDid);

        const db = getTestDatabase();

        // Get initial last_used_at
        const initialSession = await db.get(
          'SELECT last_used_at FROM user_sessions WHERE session_token = ?',
          [sessionToken]
        );

        // Wait a bit to ensure timestamp difference
        await new Promise(resolve => setTimeout(resolve, 10));

        await getUserFromSession(sessionToken);

        // Check that last_used_at was updated
        const updatedSession = await db.get(
          'SELECT last_used_at FROM user_sessions WHERE session_token = ?',
          [sessionToken]
        );

        expect(updatedSession.last_used_at).not.toBe(initialSession.last_used_at);
      });

      it('should handle multiple concurrent session reads', async () => {
        await storeOAuthSession(testUserDid, mockOAuthSession);
        const sessionToken = await createUserSession(testUserDid);

        // Multiple concurrent reads
        const promises = Array(5).fill(null).map(() => getUserFromSession(sessionToken));
        const results = await Promise.all(promises);

        // All should succeed and return same user
        results.forEach(user => {
          expect(user).toBeDefined();
          expect(user?.did).toBe(testUserDid);
        });
      });
    });

    describe('deleteSessionByToken', () => {
      it('should delete session by token', async () => {
        await storeOAuthSession(testUserDid, mockOAuthSession);
        const sessionToken = await createUserSession(testUserDid);

        // Verify session exists
        const beforeDelete = await getUserFromSession(sessionToken);
        expect(beforeDelete).toBeDefined();

        await deleteSessionByToken(sessionToken);

        // Verify session is gone
        const afterDelete = await getUserFromSession(sessionToken);
        expect(afterDelete).toBeUndefined();
      });

      it('should handle deleting non-existent token gracefully', async () => {
        // Should not throw error
        await expect(deleteSessionByToken('non-existent-token')).resolves.not.toThrow();
      });

      it('should only delete specified token', async () => {
        // Create sessions for two users
        const session2 = createMockOAuthSession(testUserDid2);

        await storeOAuthSession(testUserDid, mockOAuthSession);
        await storeOAuthSession(testUserDid2, session2);

        const token1 = await createUserSession(testUserDid);
        const token2 = await createUserSession(testUserDid2);

        await deleteSessionByToken(token1);

        // Token1 should be gone
        const user1 = await getUserFromSession(token1);
        expect(user1).toBeUndefined();

        // Token2 should still work
        const user2 = await getUserFromSession(token2);
        expect(user2).toBeDefined();
        expect(user2?.did).toBe(testUserDid2);
      });
    });
  });

  describe('Database Constraints and Edge Cases', () => {
    it('should enforce foreign key constraint on user_did', async () => {
      const db = getTestDatabase();

      await expect(
        db.run(`
          INSERT INTO user_sessions (session_token, user_did, session_data)
          VALUES (?, ?, ?)
        `, ['test-token', 'did:nonexistent:user', '{}'])
      ).rejects.toThrow();
    });

    it('should enforce unique constraint on session_token', async () => {
      const db = getTestDatabase();

      // Insert first session
      await db.run(`
        INSERT INTO user_sessions (session_token, user_did, session_data)
        VALUES (?, ?, ?)
      `, ['duplicate-token', testUserDid, '{}']);

      // Try to insert duplicate token
      await expect(
        db.run(`
          INSERT INTO user_sessions (session_token, user_did, session_data)
          VALUES (?, ?, ?)
        `, ['duplicate-token', testUserDid2, '{}'])
      ).rejects.toThrow();
    });

    it('should handle primary key constraint (one session per user)', async () => {
      const db = getTestDatabase();

      // Insert first session for user
      await db.run(`
        INSERT INTO user_sessions (session_token, user_did, session_data)
        VALUES (?, ?, ?)
      `, ['token1', testUserDid, '{}']);

      // Try to insert second session for same user with different token
      await expect(
        db.run(`
          INSERT INTO user_sessions (session_token, user_did, session_data)
          VALUES (?, ?, ?)
        `, ['token2', testUserDid, '{}'])
      ).rejects.toThrow();
    });

    it('should handle timestamp defaults', async () => {
      const mockSession = createMockOAuthSession(testUserDid);
      await storeOAuthSession(testUserDid, mockSession);

      const db = getTestDatabase();
      const session = await db.get('SELECT * FROM user_sessions WHERE user_did = ?', [testUserDid]);

      expect(session.created_at).toBeDefined();
      expect(session.last_used_at).toBeDefined();

      // Timestamps should be recent
      const createdAt = new Date(session.created_at);
      const lastUsedAt = new Date(session.last_used_at);
      const now = new Date();

      expect(now.getTime() - createdAt.getTime()).toBeLessThan(60000); // Less than 1 minute
      expect(now.getTime() - lastUsedAt.getTime()).toBeLessThan(60000);
    });

    it('should handle large session data', async () => {
      // Use 'any' type for testing edge case with large data
      const largeSession: any = {
        ...createMockOAuthSession(testUserDid),

        // Add large test data (this wouldn't be in real NodeSavedSession)
        _testLargeData: {
          largeString: 'x'.repeat(10000), // 10KB of data
          nested: {
            deeply: {
              nested: {
                object: 'test',
                array: Array(100).fill('data')
              }
            }
          }
        }
      };

      await storeOAuthSession(testUserDid, largeSession);
      const retrieved = await getOAuthSession(testUserDid);

      expect(retrieved).toEqual(largeSession);
      expect((retrieved as any)?._testLargeData.largeString.length).toBe(10000);
    });

    it('should handle special characters in session data', async () => {
      // Use properly typed session with special characters in valid fields
      const specialSession: NodeSavedSession = {
        ...createMockOAuthSession(testUserDid),
        tokenSet: {
          ...createMockOAuthSession(testUserDid).tokenSet,
          access_token: 'at_🎉_special_chars_åßç∂éƒ©'
        }
      };

      await storeOAuthSession(testUserDid, specialSession);
      const retrieved = await getOAuthSession(testUserDid);

      expect(retrieved).toEqual(specialSession);
      expect(retrieved?.tokenSet.access_token).toBe('at_🎉_special_chars_åßç∂éƒ©');
    });

    it('should handle session data with null values', async () => {
      // Use 'any' for testing null handling in extended session data
      const sessionWithNulls: any = {
        ...createMockOAuthSession(testUserDid),

        // Test null handling in tokenSet (refresh_token can be null)
        tokenSet: {
          ...createMockOAuthSession(testUserDid).tokenSet,
          refresh_token: null // This is valid - refresh tokens can be null
        },

        // Add test fields for null handling
        _testNullHandling: {
          nullValue: null,
          undefinedValue: undefined,
          emptyString: '',
          zero: 0,
          false: false,
          emptyArray: [],
          emptyObject: {}
        }
      };

      await storeOAuthSession(testUserDid, sessionWithNulls);
      const retrieved = await getOAuthSession(testUserDid);

      // Note: undefined values get lost in JSON serialization
      expect(retrieved?.tokenSet.refresh_token).toBeNull();
      expect((retrieved as any)?._testNullHandling.nullValue).toBeNull();
      expect((retrieved as any)?._testNullHandling.emptyString).toBe('');
      expect((retrieved as any)?._testNullHandling.zero).toBe(0);
      expect((retrieved as any)?._testNullHandling.false).toBe(false);
      expect((retrieved as any)?._testNullHandling.emptyArray).toEqual([]);
      expect((retrieved as any)?._testNullHandling.emptyObject).toEqual({});
      expect('undefinedValue' in (retrieved as any)._testNullHandling).toBe(false);
    });
  });

  describe('Session Token Generation', () => {
    it('should generate consistent tokens for same user', async () => {
      const mockSession = createMockOAuthSession(testUserDid);

      await storeOAuthSession(testUserDid, mockSession);
      const token1 = await createUserSession(testUserDid);

      await deleteSessionByToken(token1);
      await storeOAuthSession(testUserDid, mockSession);
      const token2 = await createUserSession(testUserDid);

      expect(token1).toBe(token2); // Same user should generate same token
    });

    it('should generate different tokens for different users', async () => {
      const session1 = createMockOAuthSession(testUserDid);
      const session2 = createMockOAuthSession(testUserDid2);

      // Mock different token generation for different users
      const crypto = await import('crypto');
      const createHmacSpy = vi.spyOn(crypto, 'createHmac');

      createHmacSpy
        .mockReturnValueOnce({
          update: vi.fn(() => ({
            digest: vi.fn(() => 'token-for-user1')
          }))
        } as any)
        .mockReturnValueOnce({
          update: vi.fn(() => ({
            digest: vi.fn(() => 'token-for-user2')
          }))
        } as any);

      await storeOAuthSession(testUserDid, session1);
      await storeOAuthSession(testUserDid2, session2);

      const token1 = await createUserSession(testUserDid);
      const token2 = await createUserSession(testUserDid2);

      expect(token1).not.toBe(token2);

      createHmacSpy.mockRestore();
    });
  });

  describe('OAuth Session Management', () => {
    const mockOAuthSession = createMockOAuthSession(testUserDid);

    describe('storeOAuthSession', () => {
      it('should store OAuth session for new user', async () => {
        await storeOAuthSession(testUserDid, mockOAuthSession);

        const db = getTestDatabase();
        const session = await db.get(
          'SELECT * FROM user_sessions WHERE user_did = ?',
          [testUserDid]
        );

        expect(session).toBeDefined();
        expect(session.user_did).toBe(testUserDid);
        expect(session.session_token).toBe('mocked-session-token-12345');
        expect(JSON.parse(session.session_data)).toEqual(mockOAuthSession);
      });

      it('should update OAuth session for existing user', async () => {
        // Store initial session
        await storeOAuthSession(testUserDid, mockOAuthSession);

        // Update with new session data
        const updatedSession = {
          ...mockOAuthSession,
          tokenSet: {
            ...mockOAuthSession.tokenSet,
            access_token: 'at_new_access_token_54321'
          }
        };
        await storeOAuthSession(testUserDid, updatedSession);

        const storedSession = await getOAuthSession(testUserDid);
        expect(storedSession?.tokenSet.access_token).toBe('at_new_access_token_54321');

        // Should still be only one session record
        const db = getTestDatabase();
        const sessions = await db.all('SELECT * FROM user_sessions WHERE user_did = ?', [testUserDid]);
        expect(sessions).toHaveLength(1);
      });

      it('should handle concurrent session storage', async () => {
        const sessions = Array(3).fill(null).map((_, i) => ({
          ...mockOAuthSession,
          tokenSet: {
            ...mockOAuthSession.tokenSet,
            access_token: `at_token_${i}`
          }
        }));

        // Store sessions concurrently
        await Promise.all(
          sessions.map(session => storeOAuthSession(testUserDid, session))
        );

        // Should only have one session (last one wins)
        const db = getTestDatabase();
        const storedSessions = await db.all('SELECT * FROM user_sessions WHERE user_did = ?', [testUserDid]);
        expect(storedSessions).toHaveLength(1);
      });

      it('should throw error for non-existent user', async () => {
        // This test depends on whether your createOrUpdateUser creates users automatically
        // If it creates users, this test would need to be modified
        await expect(
          storeOAuthSession('did:nonexistent:user', mockOAuthSession)
        ).rejects.toThrow();
      });
    });

    describe('getOAuthSession', () => {
      it('should retrieve stored OAuth session', async () => {
        await storeOAuthSession(testUserDid, mockOAuthSession);

        const retrieved = await getOAuthSession(testUserDid);

        expect(retrieved).toEqual(mockOAuthSession);
      });

      it('should return undefined for non-existent session', async () => {
        const result = await getOAuthSession('did:nonexistent:user');
        expect(result).toBeUndefined();
      });

      it('should return undefined for user with no session', async () => {
        const result = await getOAuthSession(testUserDid);
        expect(result).toBeUndefined();
      });

      it('should handle JSON parsing correctly', async () => {
        await storeOAuthSession(testUserDid, mockOAuthSession);
        const retrieved = await getOAuthSession(testUserDid);

        expect(retrieved).toEqual(mockOAuthSession);
      });
    });

    describe('deleteOAuthSession', () => {
      it('should delete OAuth session for user', async () => {
        await storeOAuthSession(testUserDid, mockOAuthSession);

        // Verify session exists
        const beforeDelete = await getOAuthSession(testUserDid);
        expect(beforeDelete).toBeDefined();

        await deleteOAuthSession(testUserDid);

        // Verify session is gone
        const afterDelete = await getOAuthSession(testUserDid);
        expect(afterDelete).toBeUndefined();
      });

      it('should not affect other users sessions', async () => {
        const session2: any = {
          ...mockOAuthSession,
          sub: testUserDid2,
          tokenSet: {
            ...mockOAuthSession.tokenSet,
            access_token: 'at_user2_token'
          }
        };

        await storeOAuthSession(testUserDid, mockOAuthSession);
        await storeOAuthSession(testUserDid2, session2);

        await deleteOAuthSession(testUserDid);

        // User1 session should be gone
        const user1Session = await getOAuthSession(testUserDid);
        expect(user1Session).toBeUndefined();

        // User2 session should still exist
        const user2Session = await getOAuthSession(testUserDid2);
        expect(user2Session).toBeDefined();
      });

      it('should handle deleting non-existent session gracefully', async () => {
        // Should not throw error
        await expect(deleteOAuthSession('did:nonexistent:user')).resolves.not.toThrow();
      });
    });
  });

  describe('User Session Management', () => {
    const mockOAuthSession: any = {
      sub: testUserDid,
      aud: 'http://localhost:3000/client-metadata.json',
      iss: 'https://bsky.social',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      scope: 'atproto transition:generic',

      dpop: {
        kty: 'EC',
        crv: 'P-256',
        x: 'test-x-value',
        y: 'test-y-value',
        d: 'test-d-value'
      },

      tokenSet: {
        access_token: 'at_test_access_token_12345',
        token_type: 'DPoP',
        expires_at: Date.now() + 3600000,
        refresh_token: 'rt_test_refresh_token_67890',
        scope: 'atproto transition:generic'
      }
    };

    describe('createUserSession', () => {
      it('should create user session when OAuth session exists', async () => {
        // Store OAuth session first
        await storeOAuthSession(testUserDid, mockOAuthSession);

        const sessionToken = await createUserSession(testUserDid);

        expect(sessionToken).toBe('mocked-session-token-12345');

        // Verify session was stored
        const db = getTestDatabase();
        const session = await db.get(
          'SELECT * FROM user_sessions WHERE session_token = ?',
          [sessionToken]
        );

        expect(session).toBeDefined();
        expect(session.user_did).toBe(testUserDid);
        expect(JSON.parse(session.session_data)).toEqual(mockOAuthSession);
      });

      it('should throw error when no OAuth session exists', async () => {
        await expect(createUserSession(testUserDid))
          .rejects.toThrow('No OAuth session found for user');
      });

      it('should update existing session token', async () => {
        await storeOAuthSession(testUserDid, mockOAuthSession);

        // Create first session
        const token1 = await createUserSession(testUserDid);

        // Create second session (should replace first)
        const token2 = await createUserSession(testUserDid);

        expect(token1).toBe(token2); // Same user generates same token

        // Should only have one session
        const db = getTestDatabase();
        const sessions = await db.all('SELECT * FROM user_sessions WHERE user_did = ?', [testUserDid]);
        expect(sessions).toHaveLength(1);
      });

      it('should create user if user does not exist', async () => {
        const newUserDid = 'did:test:newuser';

        const newUserSession: any = {
          sub: newUserDid,
          aud: 'http://localhost:3000/client-metadata.json',
          iss: 'https://bsky.social',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
          tokenSet: {
            access_token: 'at_new_user_token',
            token_type: 'DPoP'
          }
        };

        // Store OAuth session for new user
        await storeOAuthSession(newUserDid, newUserSession);

        const sessionToken = await createUserSession(newUserDid);

        expect(sessionToken).toBeDefined();

        // Verify user was created
        const db = getTestDatabase();
        const user = await db.get('SELECT * FROM users WHERE did = ?', [newUserDid]);
        expect(user).toBeDefined();
        expect(user.did).toBe(newUserDid);
      });
    });

    describe('getUserFromSession', () => {
      it('should retrieve user from valid session token', async () => {
        await storeOAuthSession(testUserDid, mockOAuthSession);
        const sessionToken = await createUserSession(testUserDid);

        const user = await getUserFromSession(sessionToken);

        expect(user).toBeDefined();
        expect(user?.did).toBe(testUserDid);
        expect(user?.created_at).toBeDefined();
        expect(user?.last_login).toBeDefined();
      });

      it('should return undefined for invalid session token', async () => {
        const user = await getUserFromSession('invalid-token');
        expect(user).toBeUndefined();
      });

      it('should update last_used_at when retrieving user', async () => {
        await storeOAuthSession(testUserDid, mockOAuthSession);
        const sessionToken = await createUserSession(testUserDid);

        const db = getTestDatabase();

        // Get initial last_used_at
        const initialSession = await db.get(
          'SELECT last_used_at FROM user_sessions WHERE session_token = ?',
          [sessionToken]
        );

        // Wait a bit to ensure timestamp difference
        await new Promise(resolve => setTimeout(resolve, 10));

        await getUserFromSession(sessionToken);

        // Check that last_used_at was updated
        const updatedSession = await db.get(
          'SELECT last_used_at FROM user_sessions WHERE session_token = ?',
          [sessionToken]
        );

        expect(updatedSession.last_used_at).not.toBe(initialSession.last_used_at);
      });

      it('should handle multiple concurrent session reads', async () => {
        await storeOAuthSession(testUserDid, mockOAuthSession);
        const sessionToken = await createUserSession(testUserDid);

        // Multiple concurrent reads
        const promises = Array(5).fill(null).map(() => getUserFromSession(sessionToken));
        const results = await Promise.all(promises);

        // All should succeed and return same user
        results.forEach(user => {
          expect(user).toBeDefined();
          expect(user?.did).toBe(testUserDid);
        });
      });
    });

    describe('deleteSessionByToken', () => {
      it('should delete session by token', async () => {
        await storeOAuthSession(testUserDid, mockOAuthSession);
        const sessionToken = await createUserSession(testUserDid);

        // Verify session exists
        const beforeDelete = await getUserFromSession(sessionToken);
        expect(beforeDelete).toBeDefined();

        await deleteSessionByToken(sessionToken);

        // Verify session is gone
        const afterDelete = await getUserFromSession(sessionToken);
        expect(afterDelete).toBeUndefined();
      });

      it('should handle deleting non-existent token gracefully', async () => {
        // Should not throw error
        await expect(deleteSessionByToken('non-existent-token')).resolves.not.toThrow();
      });

      it('should only delete specified token', async () => {
        // Create sessions for two users
        const session2: any = {
          ...mockOAuthSession,
          sub: testUserDid2,
          tokenSet: {
            ...mockOAuthSession.tokenSet,
            access_token: 'at_user2_token'
          }
        };

        await storeOAuthSession(testUserDid, mockOAuthSession);
        await storeOAuthSession(testUserDid2, session2);

        const token1 = await createUserSession(testUserDid);
        const token2 = await createUserSession(testUserDid2);

        await deleteSessionByToken(token1);

        // Token1 should be gone
        const user1 = await getUserFromSession(token1);
        expect(user1).toBeUndefined();

        // Token2 should still work
        const user2 = await getUserFromSession(token2);
        expect(user2).toBeDefined();
        expect(user2?.did).toBe(testUserDid2);
      });
    });
  });

  describe('Database Constraints and Edge Cases', () => {
    it('should enforce foreign key constraint on user_did', async () => {
      const db = getTestDatabase();

      await expect(
        db.run(`
          INSERT INTO user_sessions (session_token, user_did, session_data)
          VALUES (?, ?, ?)
        `, ['test-token', 'did:nonexistent:user', '{}'])
      ).rejects.toThrow();
    });

    it('should enforce unique constraint on session_token', async () => {
      const db = getTestDatabase();

      // Insert first session
      await db.run(`
        INSERT INTO user_sessions (session_token, user_did, session_data)
        VALUES (?, ?, ?)
      `, ['duplicate-token', testUserDid, '{}']);

      // Try to insert duplicate token
      await expect(
        db.run(`
          INSERT INTO user_sessions (session_token, user_did, session_data)
          VALUES (?, ?, ?)
        `, ['duplicate-token', testUserDid2, '{}'])
      ).rejects.toThrow();
    });

    it('should handle primary key constraint (one session per user)', async () => {
      const db = getTestDatabase();

      // Insert first session for user
      await db.run(`
        INSERT INTO user_sessions (session_token, user_did, session_data)
        VALUES (?, ?, ?)
      `, ['token1', testUserDid, '{}']);

      // Try to insert second session for same user with different token
      await expect(
        db.run(`
          INSERT INTO user_sessions (session_token, user_did, session_data)
          VALUES (?, ?, ?)
        `, ['token2', testUserDid, '{}'])
      ).rejects.toThrow();
    });

    it('should handle timestamp defaults', async () => {
      const mockSession = createMockOAuthSession(testUserDid);
      await storeOAuthSession(testUserDid, mockSession);

      const db = getTestDatabase();
      const session = await db.get('SELECT * FROM user_sessions WHERE user_did = ?', [testUserDid]);

      expect(session.created_at).toBeDefined();
      expect(session.last_used_at).toBeDefined();

      const createdAt = new Date(session.created_at);
      const lastUsedAt = new Date(session.last_used_at);
      const now = new Date();

      expect(now.getTime() - createdAt.getTime()).toBeLessThan(60000); // Less than 1 minute
      expect(now.getTime() - lastUsedAt.getTime()).toBeLessThan(60000);
    });

    describe('Session Token Generation', () => {
      it('should generate consistent tokens for same user', async () => {
        const mockSession: any = {
          sub: testUserDid,
          aud: 'http://localhost:3000/client-metadata.json',
          iss: 'https://bsky.social',
          tokenSet: {
            access_token: 'at_test_token',
            token_type: 'DPoP'
          }
        };

        await storeOAuthSession(testUserDid, mockSession);
        const token1 = await createUserSession(testUserDid);

        await deleteSessionByToken(token1);
        await storeOAuthSession(testUserDid, mockSession);
        const token2 = await createUserSession(testUserDid);

        expect(token1).toBe(token2); // Same user should generate same token
      });

      it('should generate different tokens for different users', async () => {
        const session1: any = {
          sub: testUserDid,
          aud: 'http://localhost:3000/client-metadata.json',
          iss: 'https://bsky.social',
          tokenSet: {
            access_token: 'at_test_token_1',
            token_type: 'DPoP'
          }
        };
        const session2: any = {
          sub: testUserDid2,
          aud: 'http://localhost:3000/client-metadata.json',
          iss: 'https://bsky.social',
          tokenSet: {
            access_token: 'at_test_token_2',
            token_type: 'DPoP'
          }
        };

        const crypto = await import('crypto');
        const createHmacSpy = vi.spyOn(crypto, 'createHmac');

        createHmacSpy
          .mockReturnValueOnce({
            update: vi.fn(() => ({
              digest: vi.fn(() => 'token-for-user1')
            }))
          } as any)
          .mockReturnValueOnce({
            update: vi.fn(() => ({
              digest: vi.fn(() => 'token-for-user2')
            }))
          } as any);

        await storeOAuthSession(testUserDid, session1);
        await storeOAuthSession(testUserDid2, session2);

        const token1 = await createUserSession(testUserDid);
        const token2 = await createUserSession(testUserDid2);

        expect(token1, `${token1} is the same as ${token2}`).not.toBe(token2);

        createHmacSpy.mockRestore();
      });
    });
  })
});
