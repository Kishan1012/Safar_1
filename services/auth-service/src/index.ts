import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwtPlugin from '@fastify/jwt';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Pool } from 'pg';

dotenv.config();

const app = Fastify({ logger: true });
const db = new Pool({ connectionString: process.env.DATABASE_URL });

app.register(cors, { origin: true, credentials: true });
app.register(jwtPlugin, {
    secret: process.env.JWT_SECRET ?? 'dev-secret',
    sign: { expiresIn: '7d' },
});

// ─── POST /auth/signup ────────────────────────────────────────────────────────
app.post('/auth/signup', async (request, reply) => {
    const { email, name, password } = z.object({
        email: z.string().email(),
        name: z.string().min(1),
        password: z.string().min(8),
    }).parse(request.body);

    const exists = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (exists.rows.length) return reply.status(409).send({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 12);

    const { rows } = await db.query(
        `INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id, email, name, plan, created_at`,
        [email, name]
    );

    // Store hashed password — extend schema to add: ALTER TABLE users ADD COLUMN password_hash TEXT;
    await db.query('UPDATE users SET metadata = jsonb_set(COALESCE(metadata, \'{}\'::jsonb), \'{password_hash}\', $2::jsonb) WHERE id = $1',
        [rows[0].id, JSON.stringify(hash)]
    );

    const token = app.jwt.sign({ sub: rows[0].id, email, plan: 'free' });
    return reply.status(201).send({ data: { token, user: rows[0] } });
});

// ─── POST /auth/login ─────────────────────────────────────────────────────────
app.post('/auth/login', async (request, reply) => {
    const { email, password } = z.object({
        email: z.string().email(),
        password: z.string(),
    }).parse(request.body);

    const { rows } = await db.query(
        `SELECT id, email, name, plan, metadata FROM users WHERE email = $1`,
        [email]
    );

    if (!rows.length) return reply.status(401).send({ error: 'Invalid credentials' });

    const user = rows[0];
    const hash = user.metadata?.password_hash;
    const valid = hash ? await bcrypt.compare(password, hash) : false;
    if (!valid) return reply.status(401).send({ error: 'Invalid credentials' });

    const token = app.jwt.sign({ sub: user.id, email: user.email, plan: user.plan });
    return reply.send({ data: { token, user: { id: user.id, email: user.email, name: user.name, plan: user.plan } } });
});

// ─── GET /auth/me ─────────────────────────────────────────────────────────────
app.get('/auth/me', async (request, reply) => {
    try {
        const payload = await request.jwtVerify() as { sub: string };
        const { rows } = await db.query(
            'SELECT id, email, name, avatar_url, plan, created_at FROM users WHERE id = $1',
            [payload.sub]
        );
        if (!rows.length) return reply.status(404).send({ error: 'User not found' });
        return reply.send({ data: rows[0] });
    } catch {
        return reply.status(401).send({ error: 'Unauthorized' });
    }
});

// ─── GET /health ──────────────────────────────────────────────────────────────
app.get('/health', async () => ({ status: 'ok', service: 'auth-service' }));

app.listen({ port: Number(process.env.PORT ?? 3001), host: '0.0.0.0' });
