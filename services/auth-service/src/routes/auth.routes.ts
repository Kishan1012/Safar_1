/**
 * Auth Routes — Fastify plugin
 * Handles request/response shaping only.
 * Business logic lives in src/services/auth.service.ts
 */

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import * as authService from '../services/auth.service';
import { requireAuth, JwtPayload } from '../middleware/auth.middleware';

// ─── Cookie config ─────────────────────────────────────────────────────────────

const COOKIE_NAME = 'safar_session';
const IS_PROD = process.env.NODE_ENV === 'production';

const cookieOpts = {
    httpOnly: true,               // JS cannot access this cookie — blocks XSS token theft
    secure: IS_PROD,              // HTTPS only in production
    sameSite: 'strict' as const, // Blocks cross-site requests — prevents CSRF
    path: '/',
    maxAge: 60 * 15,              // 15 minutes (matches JWT expiry)
};

// ─── Schemas ──────────────────────────────────────────────────────────────────

const SignupSchema = z.object({
    email: z.string().email(),
    name: z.string().min(1).max(100),
    password: z.string().min(8).max(128),
});

const LoginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

// ─── Plugin ───────────────────────────────────────────────────────────────────

export const authRoutes: FastifyPluginAsync = async (app) => {

    // POST /auth/signup
    app.post('/signup', async (request, reply) => {
        const body = SignupSchema.parse(request.body);

        try {
            const user = await authService.register(body.email, body.name, body.password);
            const token = app.jwt.sign({
                sub: user!.id,
                email: user!.email,
                plan: user!.plan,
            });

            // Set secure HttpOnly session cookie
            reply.setCookie(COOKIE_NAME, token, cookieOpts);

            return reply.status(201).send({ data: { token, user } });

        } catch (err) {
            if (err instanceof authService.EmailTakenError) {
                return reply.status(409).send({ error: err.message });
            }
            throw err;
        }
    });

    // POST /auth/login
    app.post('/login', async (request, reply) => {
        const body = LoginSchema.parse(request.body);

        try {
            const user = await authService.login(body.email, body.password);
            const token = app.jwt.sign({
                sub: user.id,
                email: user.email,
                plan: user.plan,
            });

            // Set secure HttpOnly session cookie
            reply.setCookie(COOKIE_NAME, token, cookieOpts);

            return reply.send({ data: { token, user } });

        } catch (err) {
            if (err instanceof authService.InvalidCredentialsError) {
                // Generic message — never reveal which field was wrong
                return reply.status(401).send({ error: 'Invalid email or password' });
            }
            if (err instanceof authService.AccountLockedError) {
                return reply.status(423).send({
                    error: 'Account temporarily locked. Too many failed attempts.',
                    lockedUntil: err.lockedUntil,
                });
            }
            throw err;
        }
    });

    // POST /auth/logout — clears the session cookie
    app.post('/logout', async (_request, reply) => {
        reply.clearCookie(COOKIE_NAME, { path: '/' });
        return reply.send({ data: { message: 'Logged out' } });
    });

    // GET /auth/me (protected — requires valid JWT in Authorization header or cookie)
    app.get('/me', { onRequest: [requireAuth] }, async (request, reply) => {
        const payload = request.user as JwtPayload;
        const user = await authService.getProfile(payload.sub);
        if (!user) return reply.status(404).send({ error: 'User not found' });
        return reply.send({ data: user });
    });
};
