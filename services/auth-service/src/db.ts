import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,              // max pool size
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 2_000,
});

/** Typed single-row helper — returns null when not found */
export async function queryOne<T>(sql: string, params?: unknown[]): Promise<T | null> {
    const { rows } = await db.query(sql, params);
    return rows[0] ?? null;
}

/** Typed multi-row helper */
export async function query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const { rows } = await db.query(sql, params);
    return rows;
}
