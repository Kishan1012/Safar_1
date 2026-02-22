// ─── User ────────────────────────────────────────────────────────────────────
export type UserPlan = 'free' | 'pro' | 'team';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  plan: UserPlan;
  createdAt: string;
}

// ─── Spot ────────────────────────────────────────────────────────────────────
export type SpotCategory =
  | 'cafe'
  | 'restaurant'
  | 'hotel'
  | 'museum'
  | 'attraction'
  | 'bar'
  | 'shopping'
  | 'outdoors'
  | 'beach'
  | 'viewpoint'
  | 'other';

export type SourcePlatform = 'instagram' | 'tiktok' | 'manual' | 'screenshot' | 'google_maps';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface OpeningHours {
  openNow?: boolean;
  periods?: Array<{
    open: { day: number; time: string };
    close?: { day: number; time: string };
  }>;
  weekdayText?: string[];
}

export interface Spot {
  id: string;
  userId: string;
  name: string;
  description?: string;
  category: SpotCategory;
  coordinates: Coordinates;
  address?: string;
  city?: string;
  country?: string;
  googlePlaceId?: string;
  sourceUrl?: string;
  sourcePlatform: SourcePlatform;
  images: string[];
  rating?: number;       // 0–5
  priceLevel?: number;   // 1–4
  hours?: OpeningHours;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface CreateSpotInput {
  name: string;
  description?: string;
  category?: SpotCategory;
  coordinates?: Coordinates;
  address?: string;
  city?: string;
  country?: string;
  googlePlaceId?: string;
  sourceUrl?: string;
  sourcePlatform?: SourcePlatform;
  images?: string[];
  rating?: number;
  priceLevel?: number;
  hours?: OpeningHours;
  metadata?: Record<string, unknown>;
}

export interface ImportSpotInput {
  url?: string;
  screenshot?: string; // base64 encoded image
  platform?: SourcePlatform;
}

// ─── Collection ──────────────────────────────────────────────────────────────
export interface Collection {
  id: string;
  userId: string;
  name: string;
  description?: string;
  coverImage?: string;
  isPublic: boolean;
  destination?: string;
  spotCount?: number;
  createdAt: string;
}

export interface CollectionWithSpots extends Collection {
  spots: Spot[];
}

export interface CreateCollectionInput {
  name: string;
  description?: string;
  destination?: string;
  isPublic?: boolean;
}

// ─── Itinerary ───────────────────────────────────────────────────────────────
export interface ItineraryDaySpot {
  id: string;
  spotId: string;
  spot: Spot;
  orderIndex: number;
  travelTimeNext?: number; // minutes to next spot
  notes?: string;
}

export interface ItineraryDay {
  id: string;
  itineraryId: string;
  dayNumber: number;
  date?: string;
  notes?: string;
  spots: ItineraryDaySpot[];
}

export interface Itinerary {
  id: string;
  userId: string;
  collectionId?: string;
  name: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  isPublic: boolean;
  shareToken?: string;
  days: ItineraryDay[];
  createdAt: string;
}

export interface GenerateItineraryInput {
  collectionId: string;
  numDays: number;
  startDate?: string;
  preferences?: {
    startTime?: string; // e.g. "09:00"
    endTime?: string;   // e.g. "22:00"
    transportMode?: 'walking' | 'driving' | 'transit';
  };
}

// ─── API Response Wrappers ───────────────────────────────────────────────────
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
}

// ─── AI Extraction ──────────────────────────────────────────────────────────
export interface ExtractionResult {
  success: boolean;
  name?: string;
  description?: string;
  category?: SpotCategory;
  locationQuery?: string; // e.g. "Neko Cafe, Shinjuku, Tokyo"
  city?: string;
  country?: string;
  confidence: number; // 0–1
  rawText?: string;
}

// ─── Map ──────────────────────────────────────────────────────────────────────
export interface MapBounds {
  northeast: Coordinates;
  southwest: Coordinates;
}

export interface NearbySpotQuery {
  lat: number;
  lng: number;
  radiusMeters: number;
  category?: SpotCategory;
  limit?: number;
}
