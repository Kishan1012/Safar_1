/**
 * Supabase client — browser-safe singleton.
 * Reads env vars from Next.js public runtime config.
 * Falls back to demo values so the UI won't crash without real keys.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnon, {
    realtime: {
        params: { eventsPerSecond: 10 },
    },
});

// ─── Table Types ──────────────────────────────────────────────────────────────
export interface DayScheduleRow {
    id: string;
    trip_id: string;
    trip_day_id: string;
    poi_id: string;
    order_index: number;
    scheduled_arrival: string;
    scheduled_departure: string;
    travel_mode: string;
    travel_time_mins: number;
    itinerary_json: ItineraryDay[] | null;  // full structured payload from n8n
    created_at: string;
}

export interface ItineraryDay {
    day_number: number;
    date: string;
    theme: string;
    neighborhood: string;
    stops: ItineraryStop[];
    safar_secret?: SafarSecret;
}

export interface ItineraryStop {
    name: string;
    category: string;
    emoji: string;
    scheduled_arrival: string;
    scheduled_departure: string;
    travel_mode: string;
    travel_time_mins: number;
    estimated_cost: number;
    currency: string;
    why_youll_love_it: string;
    concierge_tip: string;
    food_verification?: FoodVerification;
    lat: number;
    lng: number;
}

export interface SafarSecret {
    title: string;
    legend: string;
    source: 'wikipedia' | 'local_lore' | 'historical_record';
    year?: string;
    image_url?: string;
}

export interface FoodVerification {
    google_rating: number;
    review_count: number;
    price_range: string;
    top_dish: string;
    verified_by_ai: boolean;
    serp_snippet: string;
}
