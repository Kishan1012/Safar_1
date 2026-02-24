/**
 * User Repository
 * All SQL lives here. No business logic, no HTTP — pure data access.
 */

import { queryOne, query } from '../db';

export interface User {
    id: string;
    email: string;
    name: string;
    avatar_url: string | null;
    plan: 'free' | 'pro' | 'team';
    password_hash: string;
    failed_attempts: number;
    locked_until: string | null;
    created_at: string;
}

export type PublicUser = Omit<User, 'password_hash' | 'failed_attempts' | 'locked_until'>;

// ─── Reads ────────────────────────────────────────────────────────────────────

export const findByEmail = (email: string) =>
    queryOne<User>(
        `SELECT id, email, name, avatar_url, plan, password_hash,
                failed_attempts, locked_until, created_at
         FROM users WHERE email = $1`,
        [email]
    );

export const findById = (id: string) =>
    queryOne<PublicUser>(
        `SELECT id, email, name, avatar_url, plan, created_at
         FROM users WHERE id = $1`,
        [id]
    );

// ─── Writes ───────────────────────────────────────────────────────────────────

export const createUser = (email: string, name: string, passwordHash: string) =>
    queryOne<PublicUser>(
        `INSERT INTO users (email, name, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id, email, name, avatar_url, plan, created_at`,
        [email, name, passwordHash]
    );

export const emailExists = async (email: string): Promise<boolean> => {
    const row = await queryOne<{ exists: boolean }>(
        `SELECT EXISTS(SELECT 1 FROM users WHERE email = $1) AS exists`,
        [email]
    );
    return row?.exists ?? false;
};

// ─── Lockout helpers ──────────────────────────────────────────────────────────

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

/**
 * Increment failed_attempts counter.
 * After MAX_ATTEMPTS failures, sets locked_until = now + LOCKOUT_MINUTES.
 */
export const recordFailedAttempt = async (userId: string): Promise<void> => {
    await query(
        `UPDATE users
         SET failed_attempts = failed_attempts + 1,
             locked_until = CASE
               WHEN failed_attempts + 1 >= $2
               THEN now() + ($3 || ' minutes')::interval
               ELSE locked_until
             END
         WHERE id = $1`,
        [userId, MAX_ATTEMPTS, LOCKOUT_MINUTES]
    );
};

/**
 * Clear lockout state after a successful login.
 */
export const resetFailedAttempts = async (userId: string): Promise<void> => {
    await query(
        `UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = $1`,
        [userId]
    );
};
