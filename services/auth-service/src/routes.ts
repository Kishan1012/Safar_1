import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const db = new Pool({ connectionString: process.env.DATABASE_URL });

export const authRoutes: FastifyPluginAsync = async (app) => {
    // ─── POST /auth/signup ────────────────────────────────────────────────────────
    app.post('/signup', async (request, reply) => {
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

        await db.query('UPDATE users SET metadata = jsonb_set(COALESCE(metadata, \\'{}\\'::jsonb), \\'{ password_hash }\\', $2::jsonb) WHERE id = $1',
            [rows[0].id, JSON.stringify(hash)]
        );

        const token = app.jwt.sign({ sub: rows[0].id, email, plan: 'free' });
        return reply.status(201).send({ data: { token, user: rows[0] } });
    });

    // ─── POST /auth/login ─────────────────────────────────────────────────────────
    app.post('/login', async (request, reply) => {
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
    app.get('/me', async (request, reply) => {
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
};
