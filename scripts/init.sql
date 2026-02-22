-- ============================================================
-- Romy Database Initialization Script
-- Run once on Docker startup to configure the database
-- ============================================================

-- Enable PostGIS extension for spatial data
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- for fuzzy text search

-- ─── Users ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email       TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  avatar_url  TEXT,
  plan        TEXT NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'pro', 'team')),
  stripe_customer_id TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);

-- ─── Spots ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS spots (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  description       TEXT,
  category          TEXT NOT NULL DEFAULT 'other'
    CHECK (category IN (
      'cafe','restaurant','hotel','museum','attraction',
      'bar','shopping','outdoors','beach','viewpoint','other'
    )),
  -- PostGIS Geography point (lat/lng in WGS84)
  location          GEOGRAPHY(POINT, 4326) NOT NULL,
  address           TEXT,
  city              TEXT,
  country           TEXT,
  google_place_id   TEXT,
  source_url        TEXT,
  source_platform   TEXT NOT NULL DEFAULT 'manual'
    CHECK (source_platform IN (
      'instagram','tiktok','manual','screenshot','google_maps'
    )),
  images            TEXT[]    DEFAULT ARRAY[]::TEXT[],
  rating            DECIMAL(2,1) CHECK (rating >= 0 AND rating <= 5),
  price_level       INT       CHECK (price_level >= 1 AND price_level <= 4),
  hours             JSONB,
  metadata          JSONB     DEFAULT '{}'::JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Spatial index for nearby queries
CREATE INDEX IF NOT EXISTS spots_location_idx ON spots USING GIST(location);
CREATE INDEX IF NOT EXISTS spots_user_id_idx ON spots(user_id);
CREATE INDEX IF NOT EXISTS spots_category_idx ON spots(category);
CREATE INDEX IF NOT EXISTS spots_city_idx ON spots(city);
-- Trigram index for fuzzy name search
CREATE INDEX IF NOT EXISTS spots_name_trgm_idx ON spots USING GIN(name gin_trgm_ops);

-- ─── Collections ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS collections (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  cover_image TEXT,
  is_public   BOOLEAN NOT NULL DEFAULT false,
  destination TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS collections_user_id_idx ON collections(user_id);

-- ─── Collection ↔ Spot (M:M) ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS collection_spots (
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  spot_id       UUID NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  added_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (collection_id, spot_id)
);

CREATE INDEX IF NOT EXISTS collection_spots_spot_idx ON collection_spots(spot_id);

-- ─── Itineraries ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS itineraries (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  collection_id UUID REFERENCES collections(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  destination   TEXT,
  start_date    DATE,
  end_date      DATE,
  is_public     BOOLEAN NOT NULL DEFAULT false,
  share_token   TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS itineraries_user_id_idx ON itineraries(user_id);
CREATE INDEX IF NOT EXISTS itineraries_share_token_idx ON itineraries(share_token);

-- ─── Itinerary Days ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS itinerary_days (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  itinerary_id UUID NOT NULL REFERENCES itineraries(id) ON DELETE CASCADE,
  day_number   INT NOT NULL,
  date         DATE,
  notes        TEXT,
  UNIQUE(itinerary_id, day_number)
);

CREATE INDEX IF NOT EXISTS itinerary_days_itinerary_idx ON itinerary_days(itinerary_id);

-- ─── Itinerary Day Spots ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS itinerary_day_spots (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  day_id              UUID NOT NULL REFERENCES itinerary_days(id) ON DELETE CASCADE,
  spot_id             UUID NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  order_index         INT NOT NULL,
  travel_time_next    INT,   -- minutes to next spot
  notes               TEXT
);

CREATE INDEX IF NOT EXISTS itinerary_day_spots_day_idx ON itinerary_day_spots(day_id);

-- ─── Social Graph (Follows) ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS follows (
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followed_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followed_id),
  CHECK (follower_id != followed_id)
);

CREATE INDEX IF NOT EXISTS follows_followed_idx ON follows(followed_id);

-- ─── AI Extraction Jobs ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS extraction_jobs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_url  TEXT,
  platform    TEXT,
  status      TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','completed','failed')),
  result      JSONB,
  error       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS extraction_jobs_user_idx ON extraction_jobs(user_id);
CREATE INDEX IF NOT EXISTS extraction_jobs_status_idx ON extraction_jobs(status);

-- ─── Updated At Trigger Function ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','spots','collections','itineraries']
  LOOP
    EXECUTE format(
      'CREATE TRIGGER update_%s_updated_at
       BEFORE UPDATE ON %s
       FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
       t, t
    );
  END LOOP;
END $$;
