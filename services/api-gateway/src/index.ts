import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import dotenv from 'dotenv';
import { authRoutes } from '@safar/auth-service/src/routes';
import { spotsRoutes } from '@safar/spot-service/src/routes/spots';
import { collectionsRoutes } from '@safar/spot-service/src/routes/collections';

dotenv.config();

const app = Fastify({ logger: { level: 'info' } });

// ─── Plugins ─────────────────────────────────────────────────────────────────
app.register(cors, {
    origin: process.env.CORS_ORIGINS?.split(',') ?? ['http://localhost:3001', 'https://safar-web.vercel.app'],
    credentials: true,
});

app.register(jwt, {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
    sign: { expiresIn: '7d' },
});

app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
});

// ─── Auth Hook (for spots) ────────────────────────────────────────────────────
app.addHook('onRequest', async (request, reply) => {
    // Skip auth for health and auth routes
    if (request.url === '/health' || request.url.startsWith('/auth/')) return;
    try {
        await request.jwtVerify();
    } catch {
        reply.status(401).send({ error: 'Unauthorized', message: 'Invalid or missing token' });
    }
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get('/health', async () => ({ status: 'ok', service: 'api-gateway' }));

// Mount downstream services
app.register(authRoutes, { prefix: '/auth' });
app.register(spotsRoutes, { prefix: '/spots' });
app.register(collectionsRoutes, { prefix: '/collections' });

// ─── Start ─────────────────────────────────────────────────────────────────────
const start = async () => {
    try {
        const port = Number(process.env.PORT ?? 3005);
        await app.listen({ port, host: '0.0.0.0' });
        console.log('API Gateway running on port', port);
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};

start();
