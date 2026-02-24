/**
 * Auth Middleware
 * A Fastify onRequest hook factory — mirrors how spot-service protects its routes.
 *
 * Usage:
 *   app.addHook('onRequest', requireAuth)
 *   — or per-route —
 *   app.get('/me', { onRequest: [requireAuth] }, handler)
 */

import { FastifyRequest, FastifyReply } from 'fastify';

export const requireAuth = async (
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> => {
    try {
        await request.jwtVerify();
    } catch {
        reply.status(401).send({
            error: 'Unauthorized',
            message: 'Valid Bearer token required',
        });
    }
};

/** Typed payload extracted from JWT — use this in route handlers */
export interface JwtPayload {
    sub: string;  // user UUID
    email: string;
    plan: 'free' | 'pro' | 'team';
}
