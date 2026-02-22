/**
 * Itinerary Generator — Core Algorithm
 *
 * Strategy:
 * 1. Fetch travel-time matrix via Mapbox Matrix API (or Google Routes)
 * 2. Cluster spots spatially (K-Means by day count)
 * 3. Order spots within each day using Nearest Neighbor TSP heuristic
 * 4. Apply time-of-day heuristics (breakfast → morning, dinner → evening)
 */

import axios from 'axios';

export interface LatLng { lat: number; lng: number; }
export interface SpotForRouting { id: string; name: string; category: string; coordinates: LatLng; }

export interface DayPlan {
    dayNumber: number;
    spots: Array<{ spot: SpotForRouting; travelTimeNext?: number; }>;
    totalTravelTimeMinutes: number;
}

const CATEGORY_TIME_PREFERENCE: Record<string, number> = {
    // Lower = earlier in day
    cafe: 1,
    museum: 2,
    attraction: 3,
    outdoors: 4,
    beach: 5,
    shopping: 6,
    restaurant: 7,
    bar: 8,
    viewpoint: 3,
    hotel: 10,
    other: 5,
};

// ─── Step 1: Build travel-time matrix via Mapbox Matrix API ──────────────────
async function buildTravelTimeMatrix(spots: SpotForRouting[]): Promise<number[][]> {
    const token = process.env.MAPBOX_ACCESS_TOKEN;
    if (!token || spots.length === 0) return [];

    // Mapbox Matrix API supports up to 25 coordinates per request
    const coords = spots.map(s => `${s.coordinates.lng},${s.coordinates.lat}`).join(';');
    const url = `https://api.mapbox.com/directions-matrix/v1/mapbox/walking/${coords}`;

    try {
        const { data } = await axios.get(url, {
            params: { access_token: token, annotations: 'duration' },
        });

        return data.durations.map((row: number[]) =>
            row.map((sec: number) => Math.round(sec / 60)) // convert seconds to minutes
        );
    } catch (err) {
        console.error('Mapbox Matrix API error:', err);
        // Fallback: estimate travel time from haversine distance
        return buildHaversineMatrix(spots);
    }
}

// Fallback: haversine-based travel time estimate
function buildHaversineMatrix(spots: SpotForRouting[]): number[][] {
    const matrix: number[][] = [];
    for (let i = 0; i < spots.length; i++) {
        matrix[i] = [];
        for (let j = 0; j < spots.length; j++) {
            const dist = haversineKm(spots[i].coordinates, spots[j].coordinates);
            matrix[i][j] = Math.round((dist / 4.5) * 60); // ~4.5 km/h walking
        }
    }
    return matrix;
}

function haversineKm(a: LatLng, b: LatLng): number {
    const R = 6371;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.asin(Math.sqrt(h));
}

// ─── Step 2: Cluster spots by day using K-Means (spatial) ────────────────────
function clusterByDay(spots: SpotForRouting[], numDays: number): SpotForRouting[][] {
    if (spots.length <= numDays) {
        // Fewer spots than days — one per day
        return spots.map(s => [s]);
    }

    // Initialize centroids (spread across spots)
    const step = Math.floor(spots.length / numDays);
    const centroids: LatLng[] = Array.from({ length: numDays }, (_, i) => ({
        lat: spots[i * step].coordinates.lat,
        lng: spots[i * step].coordinates.lng,
    }));

    for (let iter = 0; iter < 20; iter++) {
        const clusters: SpotForRouting[][] = Array.from({ length: numDays }, () => []);

        // Assign each spot to nearest centroid
        for (const spot of spots) {
            let nearest = 0;
            let minDist = Infinity;
            for (let c = 0; c < numDays; c++) {
                const d = haversineKm(spot.coordinates, centroids[c]);
                if (d < minDist) { minDist = d; nearest = c; }
            }
            clusters[nearest].push(spot);
        }

        // Recompute centroids
        for (let c = 0; c < numDays; c++) {
            if (clusters[c].length > 0) {
                centroids[c] = {
                    lat: clusters[c].reduce((s, sp) => s + sp.coordinates.lat, 0) / clusters[c].length,
                    lng: clusters[c].reduce((s, sp) => s + sp.coordinates.lng, 0) / clusters[c].length,
                };
            }
        }

        return clusters;
    }

    return [spots]; // fallback
}

// ─── Step 3: Sort within each day using category time preference + TSP ────────
function sortDaySpots(spots: SpotForRouting[], matrix: number[][], spotIndexMap: Map<string, number>): SpotForRouting[] {
    if (spots.length <= 1) return spots;

    // First sort by time-of-day preference
    const sorted = [...spots].sort((a, b) =>
        (CATEGORY_TIME_PREFERENCE[a.category] ?? 5) - (CATEGORY_TIME_PREFERENCE[b.category] ?? 5)
    );

    // Nearest Neighbor TSP starting from the first (earliest) spot
    const visited = new Set<string>();
    const route = [sorted[0]];
    visited.add(sorted[0].id);

    for (let i = 1; i < sorted.length; i++) {
        const current = route[route.length - 1];
        const currentIdx = spotIndexMap.get(current.id) ?? 0;

        let nearestSpot = sorted.find(s => !visited.has(s.id));
        let minTime = Infinity;

        for (const spot of sorted) {
            if (visited.has(spot.id)) continue;
            const spotIdx = spotIndexMap.get(spot.id) ?? 0;
            const travelTime = matrix[currentIdx]?.[spotIdx] ?? 999;
            if (travelTime < minTime) {
                minTime = travelTime;
                nearestSpot = spot;
            }
        }

        if (nearestSpot) {
            route.push(nearestSpot);
            visited.add(nearestSpot.id);
        }
    }

    return route;
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────
export async function generateItinerary(
    spots: SpotForRouting[],
    numDays: number
): Promise<DayPlan[]> {
    if (spots.length === 0) return [];

    // Build global index map for matrix addressing
    const spotIndexMap = new Map(spots.map((s, i) => [s.id, i]));

    // Build travel time matrix
    const matrix = await buildTravelTimeMatrix(spots);

    // Cluster spots into days
    const clusters = clusterByDay(spots, numDays);

    // Order each day's spots and compute travel times
    return clusters.map((clusterSpots, dayIndex) => {
        const ordered = sortDaySpots(clusterSpots, matrix, spotIndexMap);

        let totalTravelTime = 0;
        const spotsWithTimes = ordered.map((spot, i) => {
            const nextSpot = ordered[i + 1];
            let travelTimeNext: number | undefined;

            if (nextSpot) {
                const fromIdx = spotIndexMap.get(spot.id) ?? 0;
                const toIdx = spotIndexMap.get(nextSpot.id) ?? 0;
                travelTimeNext = matrix[fromIdx]?.[toIdx];
                totalTravelTime += travelTimeNext ?? 0;
            }

            return { spot, travelTimeNext };
        });

        return {
            dayNumber: dayIndex + 1,
            spots: spotsWithTimes,
            totalTravelTimeMinutes: totalTravelTime,
        };
    });
}
