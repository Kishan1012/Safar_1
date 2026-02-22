import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { query, queryOne } from '../db';

const CreateCollectionSchema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().optional(),
    destination: z.string().optional(),
    isPublic: z.boolean().default(false),
});

export const collectionsRoutes: FastifyPluginAsync = async app => {
    // ─── GET /collections ────────────────────────────────────────────────────────
    app.get('/', async (request, reply) => {
        const userId = (request.user as { sub: string }).sub;

        const collections = await query(`
      SELECT c.id, c.name, c.description, c.cover_image, c.is_public,
             c.destination, c.created_at,
             COUNT(cs.spot_id) AS spot_count
      FROM collections c
      LEFT JOIN collection_spots cs ON cs.collection_id = c.id
      WHERE c.user_id = $1
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `, [userId]);

        return reply.send({ data: collections });
    });

    // ─── POST /collections ───────────────────────────────────────────────────────
    app.post('/', async (request, reply) => {
        const userId = (request.user as { sub: string }).sub;
        const body = CreateCollectionSchema.parse(request.body);

        const collection = await queryOne(`
      INSERT INTO collections (user_id, name, description, destination, is_public)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, description, cover_image, is_public, destination, created_at
    `, [userId, body.name, body.description, body.destination, body.isPublic]);

        return reply.status(201).send({ data: collection });
    });

    // ─── GET /collections/:id ────────────────────────────────────────────────────
    app.get('/:id', async (request, reply) => {
        const userId = (request.user as { sub: string }).sub;
        const { id } = request.params as { id: string };

        const collection = await queryOne(`
      SELECT id, name, description, cover_image, is_public, destination, created_at
      FROM collections
      WHERE id = $1 AND (user_id = $2 OR is_public = true)
    `, [id, userId]);

        if (!collection) return reply.status(404).send({ error: 'Collection not found' });

        // Fetch spots in collection
        const spots = await query(`
      SELECT s.id, s.name, s.description, s.category,
        ST_Y(s.location::geometry) AS lat, ST_X(s.location::geometry) AS lng,
        s.address, s.city, s.country, s.images, s.rating, s.price_level,
        cs.added_at
      FROM collection_spots cs
      JOIN spots s ON s.id = cs.spot_id
      WHERE cs.collection_id = $1
      ORDER BY cs.added_at ASC
    `, [id]);

        return reply.send({
            data: {
                ...(collection as object),
                spots: spots.map(s => ({
                    ...(s as Record<string, unknown>),
                    coordinates: { lat: (s as Record<string, unknown>).lat, lng: (s as Record<string, unknown>).lng },
                    lat: undefined,
                    lng: undefined,
                })),
            },
        });
    });

    // ─── PUT /collections/:id ────────────────────────────────────────────────────
    app.put('/:id', async (request, reply) => {
        const userId = (request.user as { sub: string }).sub;
        const { id } = request.params as { id: string };
        const body = CreateCollectionSchema.partial().parse(request.body);

        const collection = await queryOne(`
      UPDATE collections
      SET name = COALESCE($3, name),
          description = COALESCE($4, description),
          destination = COALESCE($5, destination),
          is_public = COALESCE($6, is_public)
      WHERE id = $1 AND user_id = $2
      RETURNING id, name, description, is_public, destination, created_at
    `, [id, userId, body.name, body.description, body.destination, body.isPublic]);

        if (!collection) return reply.status(404).send({ error: 'Collection not found' });
        return reply.send({ data: collection });
    });

    // ─── DELETE /collections/:id ─────────────────────────────────────────────────
    app.delete('/:id', async (request, reply) => {
        const userId = (request.user as { sub: string }).sub;
        const { id } = request.params as { id: string };

        await query('DELETE FROM collections WHERE id = $1 AND user_id = $2', [id, userId]);
        return reply.status(204).send();
    });

    // ─── POST /collections/:id/spots ─────────────────────────────────────────────
    app.post('/:id/spots', async (request, reply) => {
        const userId = (request.user as { sub: string }).sub;
        const { id } = request.params as { id: string };
        const { spotId } = request.body as { spotId: string };

        // Verify collection ownership
        const collection = await queryOne('SELECT id FROM collections WHERE id = $1 AND user_id = $2', [id, userId]);
        if (!collection) return reply.status(404).send({ error: 'Collection not found' });

        await query(`
      INSERT INTO collection_spots (collection_id, spot_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    `, [id, spotId]);

        return reply.status(201).send({ message: 'Spot added to collection' });
    });

    // ─── DELETE /collections/:id/spots/:spotId ───────────────────────────────────
    app.delete('/:id/spots/:spotId', async (request, reply) => {
        const userId = (request.user as { sub: string }).sub;
        const { id, spotId } = request.params as { id: string; spotId: string };

        const collection = await queryOne('SELECT id FROM collections WHERE id = $1 AND user_id = $2', [id, userId]);
        if (!collection) return reply.status(404).send({ error: 'Collection not found' });

        await query('DELETE FROM collection_spots WHERE collection_id = $1 AND spot_id = $2', [id, spotId]);
        return reply.status(204).send();
    });
};
