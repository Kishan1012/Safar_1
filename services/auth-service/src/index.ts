/**
 * Auth Service — bootstrap
 * Plugins registered here; routes mounted with prefix.
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwtPlugin from '@fastify/jwt';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import dotenv from 'dotenv';

dotenv.config();

const IS_PROD = process.env.NODE_ENV === 'production';

const app = Fastify({ logger: true });

// ─── CORS ─────────────────────────────────────────────────────────────────────
// Explicitly whitelist only your frontend — never use `origin: true` in production
const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3001')
    .split(',')
    .map(o => o.trim());

app.register(cors, {
    origin: (origin, cb) => {
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        cb(new Error('Not allowed by CORS'), false);
    },
    credentials: true,  // Required so the browser sends the HttpOnly cookie cross-origin
});

// ─── Cookies ──────────────────────────────────────────────────────────────────
app.register(cookie, {
    secret: process.env.COOKIE_SECRET ?? 'change-me-in-production',
    parseOptions: {},
});

// ─── JWT ──────────────────────────────────────────────────────────────────────
// Short-lived: 15 minutes. Use a refresh token flow for longer sessions.
app.register(jwtPlugin, {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
    sign: { expiresIn: '15m' },
    cookie: {
        cookieName: 'safar_session',  // Also verify JWTs arriving via cookie
        signed: false,
    },
});

// ─── Rate Limiting ────────────────────────────────────────────────────────────
// Applied globally — 100 req/min normally, individually tightened on auth routes below
app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({
        error: 'Too many requests. Please slow down.',
        statusCode: 429,
    }),
});

// ─── Routes ──────────────────────────────────────────────────────────────────
import { authRoutes } from './routes/auth.routes';

// Auth routes get a tighter separate rate limit: 10 attempts per 15 minutes
app.register(async (authApp) => {
    authApp.register(rateLimit, {
        max: 10,
        timeWindow: '15 minutes',
        keyGenerator: (req) => req.ip,
        errorResponseBuilder: () => ({
            error: 'Too many login attempts. Try again in 15 minutes.',
            statusCode: 429,
        }),
    });
    authApp.register(authRoutes);
}, { prefix: '/auth' });

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/health', async () => ({ status: 'ok', service: 'auth-service' }));

// ─── Start ───────────────────────────────────────────────────────────────────
app.listen({ port: Number(process.env.PORT ?? 3003), host: '0.0.0.0' });
