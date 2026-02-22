-- ============================================================
-- AI Trip Planner — Extended Schema (v2)
-- Multi-city itineraries, Traveler DNA, Budget Tracking,
-- Neighborhood Clustering, Offline Cache
-- ============================================================

-- ─── Traveler DNA ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS traveler_profiles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,

  -- Pace
  pace            TEXT NOT NULL DEFAULT 'moderate'
                  CHECK (pace IN ('slow', 'moderate', 'fast')),

  -- Budget tiers
  budget_tier     TEXT NOT NULL DEFAULT 'mid_range'
                  CHECK (budget_tier IN ('backpacker', 'mid_range', 'business', 'luxury')),

  -- Age bracket (drives crowd/accessibility recommendations)
  age_bracket     TEXT DEFAULT 'adult'
                  CHECK (age_bracket IN ('teen', 'adult', 'senior', 'family')),

  -- Interests (multi-select stored as array)
  interests       TEXT[]  DEFAULT ARRAY[]::TEXT[],
  -- Possible values: history, foodie, adventure, art, wellness, nightlife,
  --                  beach, nature, shopping, architecture, spirituality, wildlife

  -- Travel style overrides
  max_stops_per_day   INT DEFAULT 5,
  preferred_start_time TIME DEFAULT '09:00',
  preferred_end_time   TIME DEFAULT '21:00',
  avoid_crowds         BOOLEAN DEFAULT false,
  needs_accessibility  BOOLEAN DEFAULT false,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Trips (multi-city container) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trips (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'generated', 'booked', 'completed', 'archived')),

  -- Total trip window
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,

  -- Budget
  budget_currency TEXT NOT NULL DEFAULT 'INR',
  total_budget    DECIMAL(12,2),             -- user's stated budget cap
  estimated_cost  DECIMAL(12,2),             -- running AI estimate
  actual_cost     DECIMAL(12,2),             -- post-trip actual

  -- AI generation metadata
  ai_model        TEXT DEFAULT 'gpt-4o',
  generation_count INT DEFAULT 0,            -- how many times re-generated

  -- Sharing
  is_public       BOOLEAN DEFAULT false,
  share_token     TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),

  -- Offline cache — full JSON snapshot of the itinerary
  offline_snapshot JSONB,
  snapshot_updated_at TIMESTAMPTZ,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trips_user_idx ON trips(user_id);
CREATE INDEX IF NOT EXISTS trips_share_token_idx ON trips(share_token);

-- ─── Trip Cities (multi-city legs) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trip_cities (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id         UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  city_name       TEXT NOT NULL,
  country         TEXT NOT NULL,
  latitude        DECIMAL(10, 7),
  longitude       DECIMAL(10, 7),
  arrival_date    DATE NOT NULL,
  departure_date  DATE NOT NULL,
  order_index     INT NOT NULL,              -- sequence within multi-city trip
  hotel_name      TEXT,
  hotel_address   TEXT,
  hotel_lat       DECIMAL(10, 7),
  hotel_lng       DECIMAL(10, 7),
  hotel_cost_per_night DECIMAL(10,2),
  hotel_booking_ref TEXT,
  UNIQUE(trip_id, order_index)
);

CREATE INDEX IF NOT EXISTS trip_cities_trip_idx ON trip_cities(trip_id);

-- ─── Neighborhoods ────────────────────────────────────────────────────────────
-- Clusters of POIs within a city — prevents ping-ponging
CREATE TABLE IF NOT EXISTS neighborhoods (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_city_id    UUID NOT NULL REFERENCES trip_cities(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,             -- e.g. "Trastevere", "Champs-Élysées"
  center_lat      DECIMAL(10, 7),
  center_lng      DECIMAL(10, 7),
  radius_meters   INT DEFAULT 1500,          -- clustering radius
  assigned_day    INT,                       -- which trip day this neighborhood is on
  color_hex       TEXT DEFAULT '#FF6B1A'     -- for map visualization
);

-- ─── Points of Interest (POIs) ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pois (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_city_id        UUID NOT NULL REFERENCES trip_cities(id) ON DELETE CASCADE,
  neighborhood_id     UUID REFERENCES neighborhoods(id) ON DELETE SET NULL,

  -- Identity
  name                TEXT NOT NULL,
  category            TEXT NOT NULL
                      CHECK (category IN (
                        'attraction', 'museum', 'restaurant', 'cafe', 'bar',
                        'hotel', 'transport', 'shopping', 'nature', 'temple',
                        'beach', 'viewpoint', 'activity', 'event', 'other'
                      )),
  description         TEXT,

  -- Location
  address             TEXT,
  latitude            DECIMAL(10, 7) NOT NULL,
  longitude           DECIMAL(10, 7) NOT NULL,
  location            GEOGRAPHY(POINT, 4326)
                      GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography) STORED,

  -- Google Places data
  google_place_id     TEXT,
  rating              DECIMAL(2, 1),
  price_level         INT CHECK (price_level BETWEEN 1 AND 4),
  website             TEXT,
  phone               TEXT,

  -- Timing
  opening_time        TIME,
  closing_time        TIME,
  visit_duration_mins INT DEFAULT 60,        -- AI-estimated visit time
  best_time_of_day    TEXT CHECK (best_time_of_day IN ('morning','midday','afternoon','evening','night')),

  -- Costs (estimated)
  entry_cost          DECIMAL(8, 2) DEFAULT 0,
  avg_meal_cost       DECIMAL(8, 2),         -- for restaurants
  cost_currency       TEXT DEFAULT 'INR',

  -- Booking
  booking_url         TEXT,
  booking_ref         TEXT,
  requires_booking    BOOLEAN DEFAULT false,

  -- AI metadata
  ai_score            DECIMAL(3, 2),         -- 0-1 match score against Traveler DNA
  source              TEXT DEFAULT 'google_places', -- or 'scraper', 'manual'
  is_rejected         BOOLEAN DEFAULT false, -- user rejected this POI
  rejection_reason    TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pois_city_idx ON pois(trip_city_id);
CREATE INDEX IF NOT EXISTS pois_neighborhood_idx ON pois(neighborhood_id);
CREATE INDEX IF NOT EXISTS pois_location_idx ON pois USING GIST(location);
CREATE INDEX IF NOT EXISTS pois_category_idx ON pois(category);

-- ─── Trip Days ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trip_days (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_city_id    UUID NOT NULL REFERENCES trip_cities(id) ON DELETE CASCADE,
  neighborhood_id UUID REFERENCES neighborhoods(id) ON DELETE SET NULL,
  day_number      INT NOT NULL,              -- overall trip day (1-based)
  local_date      DATE NOT NULL,
  theme           TEXT,                      -- e.g. "Ancient Rome", "Beach Day"
  weather_forecast TEXT,                     -- cached from weather API

  -- Budget for this day
  estimated_day_cost  DECIMAL(10, 2),
  actual_day_cost     DECIMAL(10, 2),

  -- AI-generated notes
  morning_note    TEXT,
  evening_note    TEXT,
  logistics_note  TEXT,

  UNIQUE(trip_city_id, day_number)
);

-- ─── Day Schedule (ordered POI visits) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS day_schedule (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_day_id         UUID NOT NULL REFERENCES trip_days(id) ON DELETE CASCADE,
  poi_id              UUID NOT NULL REFERENCES pois(id) ON DELETE CASCADE,

  -- Timing
  order_index         INT NOT NULL,
  scheduled_arrival   TIME,
  scheduled_departure TIME,

  -- Travel from previous stop
  travel_mode         TEXT DEFAULT 'walking'
                      CHECK (travel_mode IN ('walking', 'transit', 'taxi', 'driving', 'cycling')),
  travel_time_mins    INT,                   -- calculated from Google Maps / Mapbox
  travel_distance_km  DECIMAL(6, 2),
  travel_cost_estimate DECIMAL(8, 2) DEFAULT 0,

  -- Meal slot flag
  is_meal_stop        BOOLEAN DEFAULT false,
  meal_type           TEXT CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack', NULL)),

  -- Dynamic optimization
  is_ai_suggested     BOOLEAN DEFAULT true,
  user_confirmed      BOOLEAN DEFAULT false,
  notes               TEXT
);

CREATE INDEX IF NOT EXISTS day_schedule_day_idx ON day_schedule(trip_day_id);
CREATE INDEX IF NOT EXISTS day_schedule_order_idx ON day_schedule(trip_day_id, order_index);

-- ─── Budget Line Items ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS budget_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id         UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  trip_day_id     UUID REFERENCES trip_days(id) ON DELETE SET NULL,
  poi_id          UUID REFERENCES pois(id) ON DELETE SET NULL,

  category        TEXT NOT NULL
                  CHECK (category IN ('flight', 'hotel', 'activity', 'food', 'transport', 'shopping', 'misc')),
  label           TEXT NOT NULL,
  estimated_cost  DECIMAL(12, 2),
  actual_cost     DECIMAL(12, 2),
  currency        TEXT DEFAULT 'INR',
  usd_equivalent  DECIMAL(12, 2),           -- normalized for multi-currency trips

  booked          BOOLEAN DEFAULT false,
  booking_ref     TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS budget_items_trip_idx ON budget_items(trip_id);

-- ─── Flight Legs ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS flight_legs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id         UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  origin_iata     TEXT NOT NULL,             -- e.g. "DEL"
  destination_iata TEXT NOT NULL,            -- e.g. "GOI"
  departure_dt    TIMESTAMPTZ NOT NULL,
  arrival_dt      TIMESTAMPTZ NOT NULL,
  airline         TEXT,
  flight_number   TEXT,
  cabin_class     TEXT DEFAULT 'economy'
                  CHECK (cabin_class IN ('economy', 'premium_economy', 'business', 'first')),
  price           DECIMAL(10, 2),
  currency        TEXT DEFAULT 'INR',
  booking_ref     TEXT,
  skyscanner_deep_link TEXT,
  order_index     INT NOT NULL
);

-- ─── AI Generation Jobs ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_generation_jobs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id         UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id),

  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'researching', 'optimizing', 'personalizing', 'completed', 'failed')),

  -- Agent progress
  researcher_status   TEXT DEFAULT 'pending',
  optimizer_status    TEXT DEFAULT 'pending',
  concierge_status    TEXT DEFAULT 'pending',

  -- Payload
  input_prompt    TEXT,                      -- raw user NL prompt
  agent_logs      JSONB DEFAULT '[]'::JSONB, -- append-only agent trace
  error_message   TEXT,

  -- Metrics
  tokens_used     INT,
  latency_ms      INT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ai_jobs_trip_idx ON ai_generation_jobs(trip_id);
CREATE INDEX IF NOT EXISTS ai_jobs_status_idx ON ai_generation_jobs(status);

-- ─── Re-optimization Events ────────────────────────────────────────────────────
-- Tracks every time user rejects a stop and AI re-routes
CREATE TABLE IF NOT EXISTS reoptimization_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id         UUID NOT NULL REFERENCES trips(id),
  trip_day_id     UUID REFERENCES trip_days(id),
  rejected_poi_id UUID REFERENCES pois(id),
  rejection_reason TEXT,                     -- "too crowded", "not interested", "closed", etc.
  pois_affected   UUID[],                    -- IDs of other POIs that got reshuffled
  new_schedule    JSONB,                     -- snapshot of the new day schedule
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Offline Cache ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS offline_snapshots (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id         UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE UNIQUE,
  snapshot        JSONB NOT NULL,            -- full serialized trip (all cities, days, POIs)
  version         INT NOT NULL DEFAULT 1,
  size_bytes      INT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ
);

-- ─── Triggers ──────────────────────────────────────────────────────────────────
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['trips', 'traveler_profiles']
  LOOP
    BEGIN
      EXECUTE format(
        'CREATE TRIGGER update_%s_updated_at
         BEFORE UPDATE ON %s
         FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
         t, t
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;

-- ─── Materialized View: Daily Budget Summary ───────────────────────────────────
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_budget_summary AS
SELECT
  td.id AS trip_day_id,
  td.local_date,
  t.id AS trip_id,
  SUM(ds.travel_cost_estimate) AS transport_cost,
  SUM(CASE WHEN p.category IN ('restaurant','cafe','bar') THEN p.avg_meal_cost ELSE 0 END) AS food_cost,
  SUM(CASE WHEN p.category NOT IN ('restaurant','cafe','bar') THEN p.entry_cost ELSE 0 END) AS activity_cost,
  SUM(ds.travel_cost_estimate)
    + SUM(CASE WHEN p.category IN ('restaurant','cafe','bar') THEN p.avg_meal_cost ELSE 0 END)
    + SUM(CASE WHEN p.category NOT IN ('restaurant','cafe','bar') THEN p.entry_cost ELSE 0 END)
    AS total_estimated_day_cost
FROM trip_days td
JOIN trip_cities tc ON tc.id = td.trip_city_id
JOIN trips t ON t.id = tc.trip_id
LEFT JOIN day_schedule ds ON ds.trip_day_id = td.id
LEFT JOIN pois p ON p.id = ds.poi_id
GROUP BY td.id, td.local_date, t.id;

CREATE UNIQUE INDEX IF NOT EXISTS daily_budget_summary_idx ON daily_budget_summary(trip_day_id);
