# Safar — Monorepo

An AI-powered travel planning platform inspired by Roamy.travel. Lets users collect travel inspiration from social media, organize spots on a map, and generate AI-optimized day-by-day itineraries.

---

## Project Structure

```
safar/
├── apps/
│   ├── mobile/          # React Native (Expo) — iOS + Android
│   └── web/             # Next.js 14 — marketing site + web planner
├── services/
│   ├── api-gateway/     # Entry point: rate limiting, auth, routing
│   ├── auth-service/    # JWT, OAuth (Google, Apple, Instagram)
│   ├── user-service/    # User profiles, follows, preferences
│   ├── spot-service/    # Spots + Collections CRUD (core data)
│   ├── ai-service/      # Python: social media extraction + LLM
│   ├── itinerary-service/ # Route optimization + itinerary generation
│   ├── media-service/   # Image upload, resize, CDN
│   ├── notification-service/ # Push + email notifications
│   └── sharing-service/ # Public shareable trip links
├── packages/
│   ├── shared-types/    # TypeScript types shared across services
│   ├── ui-kit/          # Shared React Native + Web UI components
│   └── config/          # Shared ESLint, TS, and env config
├── infrastructure/
│   ├── terraform/       # AWS/GCP infrastructure as code
│   └── docker/          # Docker files and compose configs
├── scripts/             # DB migration, seeding, deployment scripts
└── docs/                # Architecture diagrams, API docs
```

---

## Quick Start

### Prerequisites
- Node.js >= 20
- Python >= 3.11
- Docker & Docker Compose
- PostgreSQL 16 with PostGIS

### 1. Clone & Install
```bash
git clone https://github.com/yourorg/safar.git
cd safar
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env
# Fill in your API keys in .env
```

### 3. Start Infrastructure (DB + Redis)
```bash
docker-compose up -d
```

### 4. Run Database Migrations
```bash
npm run db:migrate
npm run db:seed  # optional: seed with sample data
```

### 5. Start All Services
```bash
npm run dev
```

---

## Key APIs Used

| Category | API |
|---|---|
| 🗺️ Maps | Google Maps Platform, Mapbox SDK |
| 🤖 AI | OpenAI GPT-4o, Google Vision API |
| 📱 Social | Instagram Basic Display API, TikTok API |
| 🔐 Auth | Supabase Auth / Firebase Auth |
| 💳 Payments | Stripe + RevenueCat |
| 📧 Email | Resend |
| 📊 Analytics | PostHog + Sentry |

See `.env.example` for all required API keys.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile | React Native (Expo) |
| Web | Next.js 14 |
| Backend | Node.js (Fastify) + Python (FastAPI) |
| Database | PostgreSQL 16 + PostGIS |
| Cache | Redis |
| AI | OpenAI GPT-4o + Google Vision |
| Maps | Mapbox + Google Places |
| Storage | AWS S3 + CloudFront |
| Queue | BullMQ |
| Payments | Stripe + RevenueCat |
