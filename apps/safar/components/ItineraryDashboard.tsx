'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';

// ─── Interfaces ───────────────────────────────────────────────────────────────
export interface DashboardFlight {
    airline: string;
    flight_number: string;
    departure_time: string;
    arrival_time: string;
    price: string;
    duration: string;
}

export interface DashboardHotel {
    name: string;
    rating: number;
    price_per_night: string;
    neighborhood: string;
    amenities: string[];
}

export interface DashboardPlace {
    name: string;
    description: string;
    why_visit: string;
    time_needed: string;
}

export interface DashboardActivity {
    name: string;
    description: string;
    price: string;
    duration: string;
}

export interface DashboardEvent {
    name: string;
    date: string;
    location: string;
    description: string;
}

export interface DashboardLocation {
    lat: number;
    lng: number;
    name: string;
}

export interface DashboardData {
    flights?: DashboardFlight[];
    hotels?: DashboardHotel[];
    places?: DashboardPlace[];
    activities?: DashboardActivity[];
    events?: DashboardEvent[];
    locations?: DashboardLocation[];
}

interface Props {
    tripId: string | null;
    origin: string;
    destination: string;
    visible: boolean;
    rateLimitError: boolean;
}

// ─── Loading State Component ──────────────────────────────────────────────────
function LoadingState() {
    return (
        <div className="loading-state" style={{ padding: '64px 0', textAlign: 'center' }}>
            <div className="cinema-pulse-ring" style={{ margin: '0 auto 24px' }} />
            <h3 style={{ color: 'var(--text-1)', marginBottom: '8px' }}>🤖 Claude is planning your trip...</h3>
            <p style={{ color: 'var(--text-2)' }}>Scouring the web for the best flights, hotels, and hidden gems.</p>
        </div>
    );
}

// ─── Map Component (Placeholder for visual structure) ─────────────────────────
function FullWidthMap({ destination, locations }: { destination: string, locations?: DashboardLocation[] }) {
    const mapRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Attempt to render map if google object exists
        if (!mapRef.current || !locations || locations.length === 0) return;

        // Let's retry initializing map for up to 3 seconds if google script is still downloading from CityAutocomplete
        let checkCount = 0;
        const initMap = () => {
            if (typeof window !== 'undefined' && window.google && window.google.maps) {
                const bounds = new window.google.maps.LatLngBounds();
                const map = new window.google.maps.Map(mapRef.current as HTMLElement, {
                    center: { lat: locations[0].lat, lng: locations[0].lng },
                    zoom: 12,
                    styles: [
                        { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
                        { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
                        { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
                        { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] }
                    ]
                });

                locations.forEach(loc => {
                    if (loc.lat && loc.lng) {
                        const pos = { lat: loc.lat, lng: loc.lng };
                        new window.google.maps.Marker({
                            position: pos,
                            map,
                            title: loc.name
                        });
                        bounds.extend(pos);
                    }
                });
                if (locations.length > 1) {
                    map.fitBounds(bounds);
                }
            } else if (checkCount < 10) {
                checkCount++;
                setTimeout(initMap, 300);
            }
        };
        initMap();
    }, [locations]);

    if (!destination) return null;
    return (
        <div className="section" style={{ padding: 0, marginTop: '64px' }}>
            <div ref={mapRef} style={{ width: '100%', height: '500px', backgroundColor: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                {(!locations || locations.length === 0) && (
                    <>
                        <div style={{ position: 'absolute', inset: 0, opacity: 0.05, backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")' }} />
                        <div style={{ textAlign: 'center', zIndex: 1 }}>
                            <div style={{ fontSize: 64, marginBottom: 16 }}>🗺️</div>
                            <h3 style={{ color: '#111827', fontSize: '24px', fontWeight: 'bold' }}>Map of {destination}</h3>
                            <p style={{ color: '#4B5563' }}>Interactive map loading or missing location data...</p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ItineraryDashboard({ tripId, origin, destination, visible, rateLimitError }: Props) {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    const noKeys = typeof window !== 'undefined' && (
        !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
    );

    useEffect(() => {
        if (!visible) return;
        setLoading(true);

        if (noKeys) {
            // Mock data fallback if no Supabase configured
            const t = setTimeout(() => {
                setData({
                    flights: [{ airline: 'IndiGo', flight_number: '6E-123', departure_time: '10:00 AM', arrival_time: '12:30 PM', duration: '2h 30m', price: '₹4,500' }],
                    hotels: [{ name: 'Taj Mahal Palace', rating: 4.9, price_per_night: '₹15,000', neighborhood: 'Colaba', amenities: ['Pool', 'Spa', 'Sea View'] }],
                    places: [{ name: 'Gateway of India', description: 'Iconic monument overlooking the Arabian Sea.', why_visit: 'Must-see historical landmark.', time_needed: '1-2 hours' }],
                    activities: [{ name: 'Elephanta Caves Tour', description: 'Ferry ride to ancient rock-cut caves.', price: '₹250', duration: 'Half day' }],
                    events: [{ name: 'Kala Ghoda Arts Festival', date: 'Feb 1 - Feb 9', location: 'Kala Ghoda', description: 'Annual exhibition of arts and crafts.' }],
                    locations: [
                        { lat: 18.9220, lng: 72.8347, name: 'Gateway of India' },
                        { lat: 18.9217, lng: 72.8332, name: 'Taj Mahal Palace' },
                        { lat: 18.9633, lng: 72.9315, name: 'Elephanta Caves' }
                    ]
                });
                setLoading(false);
            }, 3000);
            return () => clearTimeout(t);
        }

        if (!tripId) return;

        // Parse any incoming payload
        const parseJson = (raw: unknown): DashboardData | null => {
            if (!raw) return null;
            if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) return raw as DashboardData;
            if (typeof raw === 'string') {

                // First try standard JSON parse
                try { return JSON.parse(raw) as DashboardData; } catch { }

                // If it fails (usually due to ```json wrappers), strip markdown
                try {
                    const cleanString = raw.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
                    return JSON.parse(cleanString) as DashboardData;
                } catch { }

                // Fallback: Greedy regex from first { to last }
                const objMatch = raw.match(/(\{[\s\S]*\})/m);
                if (objMatch) {
                    try { return JSON.parse(objMatch[1]) as DashboardData; } catch { }
                }
            }
            return null;
        };

        const channel = supabase
            .channel(`trip-categorized-${tripId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'day_schedule', filter: `trip_id=eq.${tripId}` },
                (payload) => {
                    console.log('[Realtime] INSERT:', payload.new);
                    const row = payload.new as { itinerary_json?: unknown };
                    const parsed = parseJson(row?.itinerary_json);
                    if (parsed) {
                        setData(parsed);
                        setLoading(false);
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'day_schedule', filter: `trip_id=eq.${tripId}` },
                (payload) => {
                    console.log('[Realtime] UPDATE:', payload.new);
                    const row = payload.new as { itinerary_json?: unknown };
                    const parsed = parseJson(row?.itinerary_json);
                    if (parsed) {
                        setData(parsed);
                        setLoading(false);
                    }
                }
            )
            .subscribe((status) => console.log('[Realtime] status:', status));

        return () => {
            supabase.removeChannel(channel);
        };
    }, [visible, tripId, noKeys]);

    if (!visible) return null;

    return (
        <div id="itinerary-dashboard" className="itinerary-dashboard" style={{ marginTop: '64px' }}>
            {/* Header */}
            <div className="dashboard-header" style={{ textAlign: 'center', marginBottom: '48px' }}>
                <h2 style={{ fontSize: '32px', color: 'var(--text-1)', marginBottom: '16px' }}>Your Trip to <span className="grad-saffron">{destination.split(',')[0]}</span></h2>
                <div style={{ display: 'inline-flex', gap: '16px', background: 'var(--surface-light)', padding: '12px 24px', borderRadius: '100px', color: 'var(--text-2)' }}>
                    <span>🛫 {origin}</span>
                    <span>→</span>
                    <span>📍 {destination}</span>
                </div>
            </div>

            {rateLimitError && (
                <div style={{ background: '#FEF2F2', border: '1px solid #F87171', color: '#991B1B', padding: '16px', borderRadius: '12px', marginBottom: '32px', textAlign: 'center' }}>
                    ⚠ Claude API Rate Limit reached. Please wait 60 seconds and try generating again.
                </div>
            )}

            {loading && !data && !rateLimitError ? (
                <LoadingState />
            ) : data ? (
                <div className="dashboard-content" style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>

                    {/* ✈️ Flights */}
                    {data.flights && data.flights.length > 0 && (
                        <section className="cat-section">
                            <h3 style={{ fontSize: '24px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ padding: '12px', background: 'rgba(255,107,26,0.1)', borderRadius: '12px', color: '#FF6B1A' }}>✈️</span>
                                Suggested Flights
                            </h3>
                            <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                                {data.flights.map((flight, i) => (
                                    <div key={i} style={{ background: 'var(--surface-light)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                            <strong style={{ fontSize: '18px', color: 'var(--text-1)' }}>{flight.airline}</strong>
                                            <span style={{ color: '#FFBA00', fontWeight: 'bold' }}>{flight.price}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-2)', fontSize: '14px' }}>
                                            <span>{flight.departure_time}</span>
                                            <span style={{ fontSize: '12px', borderBottom: '1px dashed var(--border)' }}>{flight.duration || '-'}</span>
                                            <span>{flight.arrival_time}</span>
                                        </div>
                                        <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-3)' }}>{flight.flight_number}</div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* 🏨 Hotels */}
                    {data.hotels && data.hotels.length > 0 && (
                        <section className="cat-section">
                            <h3 style={{ fontSize: '24px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ padding: '12px', background: 'rgba(19,168,152,0.1)', borderRadius: '12px', color: '#13A898' }}>🏨</span>
                                Suggested Hotels
                            </h3>
                            <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                                {data.hotels.map((hotel, i) => (
                                    <div key={i} style={{ background: 'var(--surface-light)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <strong style={{ fontSize: '18px', color: 'var(--text-1)' }}>{hotel.name}</strong>
                                            <span style={{ color: '#13A898', fontWeight: 'bold' }}>{hotel.price_per_night}/nt</span>
                                        </div>
                                        <div style={{ color: 'var(--text-2)', fontSize: '14px', marginBottom: '16px' }}>
                                            📍 {hotel.neighborhood} &nbsp;·&nbsp; ⭐ {hotel.rating}
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            {hotel.amenities?.map((am, j) => (
                                                <span key={j} style={{ fontSize: '12px', background: 'var(--surface)', padding: '4px 8px', borderRadius: '4px', color: 'var(--text-2)' }}>{am}</span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* 🏛️ Places */}
                    {data.places && data.places.length > 0 && (
                        <section className="cat-section">
                            <h3 style={{ fontSize: '24px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ padding: '12px', background: 'rgba(79,70,229,0.1)', borderRadius: '12px', color: '#8B5CF6' }}>🏛️</span>
                                Places to See
                            </h3>
                            <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                                {data.places.map((place, i) => (
                                    <div key={i} style={{ background: 'var(--surface-light)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
                                        <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'linear-gradient(to bottom, #4F46E5, #8B5CF6)' }} />
                                        <strong style={{ fontSize: '18px', color: 'var(--text-1)', display: 'block', marginBottom: '8px' }}>{place.name}</strong>
                                        <p style={{ color: 'var(--text-2)', fontSize: '14px', marginBottom: '16px', lineHeight: 1.5 }}>{place.description}</p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                                            <div style={{ color: '#8B5CF6' }}><strong>Why visit:</strong> {place.why_visit}</div>
                                            <div style={{ color: 'var(--text-3)' }}>⏱ Time needed: {place.time_needed}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* 🧗 Activities */}
                    {data.activities && data.activities.length > 0 && (
                        <section className="cat-section">
                            <h3 style={{ fontSize: '24px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ padding: '12px', background: 'rgba(233,30,140,0.1)', borderRadius: '12px', color: '#E91E8C' }}>🧗</span>
                                Things to Do
                            </h3>
                            <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                                {data.activities.map((act, i) => (
                                    <div key={i} style={{ background: 'var(--surface-light)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <strong style={{ fontSize: '18px', color: 'var(--text-1)' }}>{act.name}</strong>
                                            <span style={{ color: '#E91E8C', fontWeight: 'bold' }}>{act.price}</span>
                                        </div>
                                        <p style={{ color: 'var(--text-2)', fontSize: '14px', marginBottom: '16px', lineHeight: 1.5 }}>{act.description}</p>
                                        <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>⏱ {act.duration}</div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* 📅 Events */}
                    {data.events && data.events.length > 0 && (
                        <section className="cat-section">
                            <h3 style={{ fontSize: '24px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ padding: '12px', background: 'rgba(255,186,0,0.1)', borderRadius: '12px', color: '#FFBA00' }}>📅</span>
                                Major Events
                            </h3>
                            <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: '1fr' }}>
                                {data.events.map((event, i) => (
                                    <div key={i} style={{ display: 'flex', gap: '24px', background: 'var(--surface-light)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border)', alignItems: 'center' }}>
                                        <div style={{ background: 'var(--surface)', padding: '16px', borderRadius: '12px', textAlign: 'center', minWidth: '100px' }}>
                                            <div style={{ color: '#FFBA00', fontWeight: 'bold', fontSize: '18px' }}>{event.date.split(' ')[0]}</div>
                                            <div style={{ color: 'var(--text-2)', fontSize: '14px' }}>{event.date.split(' ').slice(1).join(' ')}</div>
                                        </div>
                                        <div>
                                            <strong style={{ fontSize: '18px', color: 'var(--text-1)', display: 'block', marginBottom: '4px' }}>{event.name}</strong>
                                            <div style={{ color: 'var(--text-3)', fontSize: '13px', marginBottom: '8px' }}>📍 {event.location}</div>
                                            <p style={{ color: 'var(--text-2)', fontSize: '14px' }}>{event.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                </div>
            ) : null}

            {/* Always show Map at the bottom once dashboard is open */}
            <FullWidthMap destination={destination} locations={data?.locations} />
        </div>
    );
}
