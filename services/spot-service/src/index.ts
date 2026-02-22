import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import dotenv from 'dotenv';
import { spotsRoutes } from './routes/spots';
import { collectionsRoutes } from './routes/collections';
import { db } from './db';

dotenv.config();

const app = Fastify({ logger: { level: 'info' } });

// ─── Plugins ─────────────────────────────────────────────────────────────────
app.register(cors, {
    origin: process.env.CORS_ORIGINS?.split(',') ?? ['http://localhost:3001'],
    credentials: true,
});

app.register(jwt, {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
});

app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
});

// ─── Auth Hook ────────────────────────────────────────────────────────────────
app.addHook('onRequest', async (request, reply) => {
    // Skip auth for health check
    if (request.url === '/health') return;
    try {
        await request.jwtVerify();
    } catch {
        reply.status(401).send({ error: 'Unauthorized', message: 'Invalid or missing token' });
    }
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get('/health', async () => ({ status: 'ok', service: 'spot-service' }));
app.register(spotsRoutes, { prefix: '/spots' });
app.register(collectionsRoutes, { prefix: '/collections' });

// ─── Start ─────────────────────────────────────────────────────────────────────
const start = async () => {
    try {
        try {
            await db.connect();
        } catch (dbErr) {
            console.warn('Could not connect to database, continuing anyway:', dbErr.message);
        }
        await app.listen({ port: Number(process.env.PORT ?? 3003), host: '0.0.0.0' });
        console.log('Spot service running on port', process.env.PORT ?? 3003);
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};

start();
