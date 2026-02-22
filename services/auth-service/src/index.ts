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

import { authRoutes } from './routes';

app.register(authRoutes, { prefix: '/auth' });

// ─── GET /health ──────────────────────────────────────────────────────────────
app.get('/health', async () => ({ status: 'ok', service: 'auth-service' }));

app.listen({ port: Number(process.env.PORT ?? 3000), host: '0.0.0.0' });
