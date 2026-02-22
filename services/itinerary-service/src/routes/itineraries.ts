import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { query, queryOne } from '../db';
import { generateItinerary, SpotForRouting } from '../itinerary-generator';

const GenerateSchema = z.object({
    collectionId: z.string().uuid(),
    numDays: z.number().min(1).max(14),
    startDate: z.string().optional(),
    preferences: z.object({
        transportMode: z.enum(['walking', 'driving', 'transit']).default('walking'),
        startTime: z.string().default('09:00'),
        endTime: z.string().default('22:00'),
    }).optional(),
});

export const itineraryRoutes: FastifyPluginAsync = async app => {
    // ─── POST /itineraries/generate ──────────────────────────────────────────────
    app.post('/generate', async (request, reply) => {
        const userId = (request.user as { sub: string }).sub;
        const body = GenerateSchema.parse(request.body);

        // Fetch all spots in the collection
        const spots = await query<SpotForRouting & { lat: number; lng: number }>(`
      SELECT s.id, s.name, s.category,
        ST_Y(s.location::geometry) AS lat,
        ST_X(s.location::geometry) AS lng
      FROM collection_spots cs
      JOIN spots s ON s.id = cs.spot_id
      JOIN collections c ON c.id = cs.collection_id
      WHERE cs.collection_id = $1 AND c.user_id = $2
    `, [body.collectionId, userId]);

        if (spots.length === 0) {
            return reply.status(400).send({ error: 'Collection has no spots' });
        }

        const spotsForRouting: SpotForRouting[] = spots.map(s => ({
            id: s.id as string,
            name: s.name as string,
            category: s.category as string,
            coordinates: { lat: s.lat, lng: s.lng },
        }));

        // Run generation algorithm
        const dayPlans = await generateItinerary(spotsForRouting, body.numDays);

        // Fetch collection info for itinerary name
        const collection = await queryOne<{ name: string; destination: string }>(`
      SELECT name, destination FROM collections WHERE id = $1
    `, [body.collectionId]);

        // Persist itinerary to database
        const itinerary = await queryOne<{ id: string }>(`
      INSERT INTO itineraries (user_id, collection_id, name, destination, start_date, end_date)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `, [
            userId,
            body.collectionId,
            `${collection?.name ?? 'Trip'} Itinerary`,
            collection?.destination,
            body.startDate ?? null,
            body.startDate
                ? new Date(new Date(body.startDate).getTime() + (body.numDays - 1) * 86400000)
                    .toISOString().split('T')[0]
                : null,
        ]);

        // Persist each day and its spots
        for (const day of dayPlans) {
            const dayRow = await queryOne<{ id: string }>(`
        INSERT INTO itinerary_days (itinerary_id, day_number)
        VALUES ($1, $2)
        RETURNING id
      `, [itinerary!.id, day.dayNumber]);

            for (let i = 0; i < day.spots.length; i++) {
                const { spot, travelTimeNext } = day.spots[i];
                await query(`
          INSERT INTO itinerary_day_spots (day_id, spot_id, order_index, travel_time_next)
          VALUES ($1, $2, $3, $4)
        `, [dayRow!.id, spot.id, i, travelTimeNext ?? null]);
            }
        }

        return reply.status(201).send({
            data: { itineraryId: itinerary!.id, days: dayPlans },
        });
    });

    // ─── GET /itineraries ────────────────────────────────────────────────────────
    app.get('/', async (request, reply) => {
        const userId = (request.user as { sub: string }).sub;
        const itineraries = await query(`
      SELECT i.id, i.name, i.destination, i.start_date, i.end_date,
             i.is_public, i.share_token, i.created_at,
             COUNT(DISTINCT d.id) AS day_count
      FROM itineraries i
      LEFT JOIN itinerary_days d ON d.itinerary_id = i.id
      WHERE i.user_id = $1
      GROUP BY i.id
      ORDER BY i.created_at DESC
    `, [userId]);

        return reply.send({ data: itineraries });
    });

    // ─── GET /itineraries/:id ────────────────────────────────────────────────────
    app.get('/:id', async (request, reply) => {
        const userId = (request.user as { sub: string }).sub;
        const { id } = request.params as { id: string };

        const itinerary = await queryOne(`
      SELECT id, name, destination, start_date, end_date, is_public, share_token, created_at
      FROM itineraries
      WHERE id = $1 AND (user_id = $2 OR is_public = true)
    `, [id, userId]);

        if (!itinerary) return reply.status(404).send({ error: 'Itinerary not found' });

        const days = await query(`
      SELECT d.id, d.day_number, d.date, d.notes
      FROM itinerary_days d
      WHERE d.itinerary_id = $1
      ORDER BY d.day_number ASC
    `, [id]);

        const daysWithSpots = await Promise.all(
            (days as Array<{ id: string; day_number: number; date: string; notes: string }>).map(async day => {
                const daySpots = await query(`
          SELECT ds.id, ds.order_index, ds.travel_time_next, ds.notes,
            s.id AS spot_id, s.name, s.description, s.category,
            ST_Y(s.location::geometry) AS lat, ST_X(s.location::geometry) AS lng,
            s.address, s.city, s.images, s.rating
          FROM itinerary_day_spots ds
          JOIN spots s ON s.id = ds.spot_id
          WHERE ds.day_id = $1
          ORDER BY ds.order_index ASC
        `, [day.id]);

                return {
                    ...day,
                    spots: daySpots.map((ds: Record<string, unknown>) => ({
                        id: ds.id,
                        orderIndex: ds.order_index,
                        travelTimeNext: ds.travel_time_next,
                        notes: ds.notes,
                        spot: {
                            id: ds.spot_id,
                            name: ds.name,
                            description: ds.description,
                            category: ds.category,
                            coordinates: { lat: ds.lat, lng: ds.lng },
                            address: ds.address,
                            city: ds.city,
                            images: ds.images,
                            rating: ds.rating,
                        },
                    })),
                };
            })
        );

        return reply.send({ data: { ...(itinerary as object), days: daysWithSpots } });
    });

    // ─── GET /share/:token (public) ──────────────────────────────────────────────
    app.get('/share/:token', {
        onRequest: async () => { }, // skip JWT for public routes
    }, async (request, reply) => {
        const { token } = request.params as { token: string };

        const itinerary = await queryOne(`
      SELECT id, name, destination, start_date, end_date, created_at
      FROM itineraries WHERE share_token = $1 AND is_public = true
    `, [token]);

        if (!itinerary) return reply.status(404).send({ error: 'Trip not found or not public' });
        return reply.send({ data: itinerary });
    });
};

// Helper re-export
function query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const { query: dbQuery } = require('../db');
    return dbQuery<T>(sql, params);
}
function queryOne<T>(sql: string, params?: unknown[]): Promise<T | null> {
    const { queryOne: dbQueryOne } = require('../db');
    return dbQueryOne<T>(sql, params);
}
