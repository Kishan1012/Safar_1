import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { generateItinerary } from './itinerary-generator';

dotenv.config();

const app = Fastify({ logger: true });

app.register(cors, { origin: true });

app.get('/health', async () => ({ status: 'ok', service: 'itinerary-service' }));

// ─── Start ─────────────────────────────────────────────────────────────────────
const start = async () => {
    try {
        await app.listen({ port: Number(process.env.PORT ?? 3004), host: '0.0.0.0' });
        console.log('Itinerary service running on port', process.env.PORT ?? 3004);
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};

start();
