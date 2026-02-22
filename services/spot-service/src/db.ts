import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

db.on('error', err => {
    console.error('Unexpected error on pg client', err);
});

// ─── Query Helpers ────────────────────────────────────────────────────────────
export async function query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
    const { rows } = await db.query(sql, params);
    return rows as T[];
}

export async function queryOne<T = unknown>(sql: string, params?: unknown[]): Promise<T | null> {
    const rows = await query<T>(sql, params);
    return rows[0] ?? null;
}
