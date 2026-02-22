import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { query, queryOne } from '../db';
import { Queue } from 'bullmq';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');
const importQueue = new Queue('spot-import', { connection: redis });

// ─── Validation Schemas ───────────────────────────────────────────────────────
const CreateSpotSchema = z.object({
    name: z.string().min(1).max(200),
    description: z.string().optional(),
    category: z
        .enum(['cafe', 'restaurant', 'hotel', 'museum', 'attraction', 'bar', 'shopping', 'outdoors', 'beach', 'viewpoint', 'other'])
        .default('other'),
    coordinates: z.object({ lat: z.number(), lng: z.number() }),
    address: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    googlePlaceId: z.string().optional(),
    sourceUrl: z.string().url().optional(),
    sourcePlatform: z.enum(['instagram', 'tiktok', 'manual', 'screenshot', 'google_maps']).default('manual'),
    images: z.array(z.string().url()).default([]),
    rating: z.number().min(0).max(5).optional(),
    priceLevel: z.number().min(1).max(4).optional(),
});

const ImportSpotSchema = z.object({
    url: z.string().url().optional(),
    screenshot: z.string().optional(), // base64
    platform: z.enum(['instagram', 'tiktok', 'screenshot']).optional(),
});

const NearbyQuerySchema = z.object({
    lat: z.coerce.number(),
    lng: z.coerce.number(),
    radius: z.coerce.number().default(1000), // meters
    category: z.string().optional(),
    limit: z.coerce.number().default(20),
});

export const spotsRoutes: FastifyPluginAsync = async app => {
    // ─── GET /spots ─────────────────────────────────────────────────────────────
    // List all spots for the authenticated user
    app.get('/', async (request, reply) => {
        const userId = (request.user as { sub: string }).sub;
        const { category, city, limit = 50, offset = 0 } = request.query as Record<string, string>;

        let sql = `
      SELECT
        id, name, description, category,
        ST_Y(location::geometry) AS lat,
        ST_X(location::geometry) AS lng,
        address, city, country, google_place_id,
        source_url, source_platform, images,
        rating, price_level, hours, metadata, created_at
      FROM spots
      WHERE user_id = $1
    `;
        const params: unknown[] = [userId];

        if (category) {
            params.push(category);
            sql += ` AND category = $${params.length}`;
        }
        if (city) {
            params.push(`%${city}%`);
            sql += ` AND city ILIKE $${params.length}`;
        }

        sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(Number(limit), Number(offset));

        const spots = await query(sql, params);

        // Map DB row to response shape (lat/lng out of PostGIS)
        return reply.send({
            data: spots.map(formatSpot),
            total: spots.length,
        });
    });

    // ─── POST /spots ────────────────────────────────────────────────────────────
    // Create a spot manually
    app.post('/', async (request, reply) => {
        const userId = (request.user as { sub: string }).sub;
        const body = CreateSpotSchema.parse(request.body);

        const spot = await queryOne(`
      INSERT INTO spots (
        user_id, name, description, category, location, address, city, country,
        google_place_id, source_url, source_platform, images, rating, price_level, hours
      ) VALUES (
        $1, $2, $3, $4,
        ST_SetSRID(ST_MakePoint($6, $5), 4326)::geography,
        $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
      )
      RETURNING id, name, description, category,
        ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lng,
        address, city, country, source_url, source_platform, images, rating, created_at
    `, [
            userId,
            body.name, body.description, body.category,
            body.coordinates.lat, body.coordinates.lng,
            body.address, body.city, body.country,
            body.googlePlaceId, body.sourceUrl, body.sourcePlatform,
            JSON.stringify(body.images), body.rating, body.priceLevel,
            body.hours ? JSON.stringify(body.hours) : null,
        ]);

        return reply.status(201).send({ data: formatSpot(spot) });
    });

    // ─── POST /spots/import ─────────────────────────────────────────────────────
    // Import spot from social media URL or screenshot via AI pipeline
    app.post('/import', async (request, reply) => {
        const userId = (request.user as { sub: string }).sub;
        const body = ImportSpotSchema.parse(request.body);

        // Create extraction job record
        const job = await queryOne<{ id: string }>(`
      INSERT INTO extraction_jobs (user_id, source_url, platform, status)
      VALUES ($1, $2, $3, 'pending')
      RETURNING id
    `, [userId, body.url, body.platform]);

        // Queue async AI extraction
        await importQueue.add('extract', {
            jobId: job!.id,
            userId,
            url: body.url,
            screenshot: body.screenshot,
            platform: body.platform,
        });

        return reply.status(202).send({
            data: { jobId: job!.id },
            message: 'Import started. Poll GET /spots/import/:jobId for status.',
        });
    });

    // ─── GET /spots/import/:jobId ───────────────────────────────────────────────
    // Poll extraction job status
    app.get('/import/:jobId', async (request, reply) => {
        const userId = (request.user as { sub: string }).sub;
        const { jobId } = request.params as { jobId: string };

        const job = await queryOne(`
      SELECT id, status, result, error, created_at, completed_at
      FROM extraction_jobs
      WHERE id = $1 AND user_id = $2
    `, [jobId, userId]);

        if (!job) return reply.status(404).send({ error: 'Not Found' });
        return reply.send({ data: job });
    });

    // ─── GET /spots/nearby ──────────────────────────────────────────────────────
    // Find spots near coordinates (PostGIS spatial query)
    app.get('/nearby', async (request, reply) => {
        const userId = (request.user as { sub: string }).sub;
        const q = NearbyQuerySchema.parse(request.query);

        const spots = await query(`
      SELECT
        id, name, description, category,
        ST_Y(location::geometry) AS lat,
        ST_X(location::geometry) AS lng,
        address, city, country, images, rating,
        ST_Distance(location, ST_MakePoint($2, $1)::geography) AS distance_meters
      FROM spots
      WHERE user_id = $4
        AND ST_DWithin(location, ST_MakePoint($2, $1)::geography, $3)
        ${q.category ? 'AND category = $5' : ''}
      ORDER BY distance_meters ASC
      LIMIT $${q.category ? 6 : 5}
    `, q.category
            ? [q.lat, q.lng, q.radius, userId, q.category, q.limit]
            : [q.lat, q.lng, q.radius, userId, q.limit]
        );

        return reply.send({ data: spots.map(formatSpot) });
    });

    // ─── GET /spots/:id ─────────────────────────────────────────────────────────
    app.get('/:id', async (request, reply) => {
        const userId = (request.user as { sub: string }).sub;
        const { id } = request.params as { id: string };

        const spot = await queryOne(`
      SELECT id, name, description, category,
        ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lng,
        address, city, country, google_place_id,
        source_url, source_platform, images, rating, price_level, hours, metadata, created_at
      FROM spots WHERE id = $1 AND user_id = $2
    `, [id, userId]);

        if (!spot) return reply.status(404).send({ error: 'Spot not found' });
        return reply.send({ data: formatSpot(spot) });
    });

    // ─── PUT /spots/:id ─────────────────────────────────────────────────────────
    app.put('/:id', async (request, reply) => {
        const userId = (request.user as { sub: string }).sub;
        const { id } = request.params as { id: string };
        const body = CreateSpotSchema.partial().parse(request.body);

        const updates: string[] = [];
        const params: unknown[] = [id, userId];

        if (body.name) { params.push(body.name); updates.push(`name = $${params.length}`); }
        if (body.description !== undefined) { params.push(body.description); updates.push(`description = $${params.length}`); }
        if (body.category) { params.push(body.category); updates.push(`category = $${params.length}`); }
        if (body.coordinates) {
            params.push(body.coordinates.lat, body.coordinates.lng);
            updates.push(`location = ST_SetSRID(ST_MakePoint($${params.length}, $${params.length - 1}), 4326)::geography`);
        }

        if (updates.length === 0) return reply.status(400).send({ error: 'No fields to update' });

        const spot = await queryOne(`
      UPDATE spots SET ${updates.join(', ')}
      WHERE id = $1 AND user_id = $2
      RETURNING id, name, description, category,
        ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lng,
        address, city, country, images, rating, created_at
    `, params);

        if (!spot) return reply.status(404).send({ error: 'Spot not found' });
        return reply.send({ data: formatSpot(spot) });
    });

    // ─── DELETE /spots/:id ──────────────────────────────────────────────────────
    app.delete('/:id', async (request, reply) => {
        const userId = (request.user as { sub: string }).sub;
        const { id } = request.params as { id: string };

        await query('DELETE FROM spots WHERE id = $1 AND user_id = $2', [id, userId]);
        return reply.status(204).send();
    });
};

// ─── Helper ───────────────────────────────────────────────────────────────────
function formatSpot(row: Record<string, unknown>) {
    return {
        ...row,
        coordinates: { lat: row.lat, lng: row.lng },
        lat: undefined,
        lng: undefined,
    };
}
