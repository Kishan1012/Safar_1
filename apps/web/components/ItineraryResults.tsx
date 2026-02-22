"use client";

import { useState, useRef, useEffect } from 'react';
import Map, { Marker, Popup, useMap, Source, Layer } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { generateAffiliateLink } from '../utils/affiliate';
import { fetchLivePricing, formatINR } from './livePricing';

// Using a public or placeholder token for Mapbox
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "pk.eyJ1Ijoia2lzaGFuc2luZ2gxMDEyMyIsImEiOiJjbWx3d2x1OGQwb2g2M2RwcXd0djh1bzdlIn0.XueJxn6rUS0BjWYZ9At0Tw";

const COLORS = {
    primary: '#FF385C',
    secondary: '#FF9933',
    accent: '#138808',
    surface: '#1E1E24', // Dark surface
    background: '#121214', // Deep dark background
    textMain: '#F9FAFB', // Bright white text for contrast
    textMuted: '#9CA3AF', // Soft gray for secondary text
    border: '#333338', // Subtle dark borders
    success: '#10B981',
    whatsapp: '#25D366'
};

// Curated selection of high-quality, realistic Unsplash imagery for Indian travel
const getRealisticImageUrl = (title: string, type: string) => {
    const text = (title + " " + type).toLowerCase();

    if (text.includes('temple') || text.includes('darshan') || text.includes('mandir') || text.includes('ghat')) {
        return "https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=600&q=80"; // Beautiful Indian temple arch
    }
    if (text.includes('fort') || text.includes('palace') || text.includes('mahal') || text.includes('heritage')) {
        return "https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=600&q=80"; // Majestic Rajasthan fort wall
    }
    if (text.includes('beach') || text.includes('sea') || text.includes('ocean') || text.includes('coast')) {
        return "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=600&q=80"; // Goa beach sunset
    }
    if (text.includes('boat') || text.includes('cruise') || text.includes('lake') || text.includes('water')) {
        return "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=600&q=80"; // Kerala backwaters boat
    }
    if (text.includes('cafe') || text.includes('coffee') || text.includes('bakery')) {
        return "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=600&q=80"; // Cozy cafe interior
    }
    if (text.includes('food') || text.includes('restaurant') || text.includes('dinner') || text.includes('lunch')) {
        return "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=600&q=80"; // Authentic Indian thali/food
    }
    if (text.includes('hotel') || text.includes('resort') || text.includes('stay') || text.includes('villa')) {
        return "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80"; // Luxury hotel pool/resort
    }
    if (text.includes('market') || text.includes('bazaar') || text.includes('shop')) {
        return "https://images.unsplash.com/photo-1533658253106-9abf00a40236?auto=format&fit=crop&w=600&q=80"; // Colorful Indian spice market
    }
    if (text.includes('airport') || text.includes('flight') || text.includes('transit')) {
        return "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=600&q=80"; // Airplane/Airport view
    }

    // Fallback beautiful Indian landscapes
    const fallbacks = [
        "https://images.unsplash.com/photo-1506461883276-594540eb36cb?auto=format&fit=crop&w=600&q=80", // Mountains / General Nature
        "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=600&q=80", // Taj Mahal / Architecture
        "https://images.unsplash.com/photo-1515091943-9d5c0ad74baf?auto=format&fit=crop&w=600&q=80"  // City streets India
    ];
    // Hash the title length to pick a stable fallback
    return fallbacks[title.length % fallbacks.length];
};

const MOCK_ITINERARY = {
    destination: "Goa, India",
    budgetRange: "Mid-range",
    estimatedCost: "₹15,000",
    days: [
        {
            day: "Day 1",
            date: "Nov 12, 2026",
            items: [
                {
                    type: "Transit",
                    title: "Airport to Hotel",
                    desc: "Pre-booked cab from GOX to North Goa.",
                    time: "10:00 AM",
                    cost: "₹1,200",
                    lat: 15.65,
                    lng: 73.85,
                    bookingLink: "https://www.makemytrip.com/cabs/",
                    bookingLabel: "Book Airport Cab"
                },
                {
                    type: "Stay",
                    title: "Baga Beach Resort",
                    desc: "Check-in at your curated mid-range stay near the beach.",
                    time: "12:00 PM",
                    cost: "₹4,500/night",
                    lat: 15.5553,
                    lng: 73.7517,
                    bookingLink: "https://www.oyorooms.com/",
                    bookingLabel: "Book on OYO"
                },
                {
                    type: "Activity",
                    title: "Lunch at Britto's",
                    desc: "Iconic shack for Goan seafood.",
                    time: "1:30 PM",
                    cost: "₹1,500",
                    lat: 15.5600,
                    lng: 73.7550
                },
                {
                    type: "Activity",
                    title: "Chapora Fort Sunset",
                    desc: "Stunning sunset views. Must-see based on your DNA!",
                    time: "5:00 PM",
                    cost: "Free",
                    lat: 15.6053,
                    lng: 73.7380
                }
            ]
        },
        {
            day: "Day 2",
            date: "Nov 13, 2026",
            items: [
                {
                    type: "Activity",
                    title: "Hidden Gem: Sweet Water Lake",
                    desc: "A fresh-water lake near Arambol beach.",
                    time: "10:00 AM",
                    cost: "Free",
                    lat: 15.6881,
                    lng: 73.7046
                },
                {
                    type: "Activity",
                    title: "Thalassa, Siolim",
                    desc: "Greek food with an epic view.",
                    time: "2:00 PM",
                    cost: "₹2,500",
                    lat: 15.6253,
                    lng: 73.7483
                }
            ]
        }
    ]
};
// Normalizes raw stringified JSON from LLM into the robust UI schema
const normalizeItineraryData = (data: any) => {
    if (!data) return null;

    let parsed = data;

    // n8n often returns an array of objects for the final node. Let's unwrap it if so.
    if (Array.isArray(data) && data.length > 0) {
        parsed = data[0];
    }

    // Handle the case where the LLM returned a markdown-wrapped string inside { "output": "..." }
    if (parsed.output && typeof parsed.output === 'string') {
        let cleanStr = parsed.output.replace(/```json\n/g, '').replace(/```\n?/g, '').trim();

        try {
            parsed = JSON.parse(cleanStr);
        } catch (e) {
            console.warn("Standard JSON parse failed, attempting auto-repair for truncated AI output...");

            // Anthropic frequently hits its Max Token limit and cuts off the JSON string mid-sentence.
            // We append common closing bracket sequences to try and salvage the valid data before the cutoff.
            const endings = ['"]}]}', '"}]}', '}]}', ']}', '}', '"}', '"]}', '"]}]}}', '"}]}}', '}]}}', ']}}', '}}', '"]}]}}]', '"}]}}]', '}]}}]', ']}}]', ']'];
            let repaired = false;

            for (const ending of endings) {
                try {
                    parsed = JSON.parse(cleanStr + ending);
                    repaired = true;
                    console.log("Successfully auto-repaired truncated JSON!");
                    break;
                } catch (repairErr) {
                    continue;
                }
            }

            if (!repaired) {
                console.error("Failed to parse and repair AI Agent output string.");
                return null;
            }
        }
    }

    // Extract itinerary array depending on where Anthropic nested it this time
    const rawItineraryArray = parsed.itinerary || (parsed.trip && parsed.trip.itinerary) || [];

    // Now normalize the structure if it uses the AI's varied schema
    if (rawItineraryArray.length > 0 && !parsed.days) {
        parsed.days = rawItineraryArray.map((dayObj: any) => ({
            day: `Day ${dayObj.day || 1}`,
            date: dayObj.title || dayObj.theme || "",
            items: (dayObj.locations || dayObj.activities || []).map((act: any) => ({
                type: act.type || act.category || "Activity",
                title: act.name || act.title || "Destination",
                desc: act.description || "",
                time: act.time || act.timing || act.operatingHours || "",
                cost: act.cost || act.estimatedCost || "Free",
                lat: act.location?.coordinates?.latitude || act.coordinates?.latitude || act.latitude || 15.6,
                lng: act.location?.coordinates?.longitude || act.coordinates?.longitude || act.longitude || 73.75,
                bookingLink: act.booking_link || act.bookingLink,
                bookingLabel: (act.booking_link || act.bookingLink) ? "Book Now" : null
            }))
        }));

        // Hoist destination back up to the top level if it was hidden inside the 'trip' object
        if (parsed.trip && parsed.trip.destination) {
            parsed.destination = parsed.trip.destination;
        }
    }

    return parsed.days ? parsed : null;
};

export default function ItineraryResults({ onBack, itineraryData }: { onBack: () => void, itineraryData?: any }) {
    const normalizedData = normalizeItineraryData(itineraryData);
    const itinerary = normalizedData || MOCK_ITINERARY;

    const initialView = itinerary.days?.[0]?.items?.[0] ? {
        longitude: itinerary.days[0].items[0].lng,
        latitude: itinerary.days[0].items[0].lat,
        zoom: 11
    } : {
        longitude: 73.75,
        latitude: 15.6,
        zoom: 11
    };

    const [viewState, setViewState] = useState(initialView);
    const [activeItem, setActiveItem] = useState<any>(null); // Track the currently selected itinerary item
    const mapRef = useRef<any>(null); // To call flyTo

    // When activeItem changes, smoothly fly the camera to that location
    useEffect(() => {
        if (activeItem && mapRef.current) {
            mapRef.current.getMap().flyTo({
                center: [activeItem.lng, activeItem.lat],
                zoom: 14,
                pitch: 60, // 3D cinematic pitch
                bearing: -20, // Slight angle for depth
                duration: 2500, // Smooth 2.5s transition
                essential: true // this animation is considered essential with respect to prefers-reduced-motion
            });
        }
    }, [activeItem]);

    // Flatten coordinates for route line
    const routeCoordinates = itinerary.days.flatMap((day: any) =>
        day.items.map((item: any) => [item.lng, item.lat])
    );

    const geojsonData = {
        type: 'Feature',
        properties: {},
        geometry: {
            type: 'LineString',
            coordinates: routeCoordinates
        }
    };

    return (
        <div style={{ display: 'flex', height: '100vh', width: '100%', background: COLORS.background, overflow: 'hidden', position: 'relative' }}>

            {/* Full-Screen Interactive Map Base */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
                <Map
                    ref={mapRef}
                    {...viewState}
                    onMove={evt => setViewState(evt.viewState)}
                    mapStyle="mapbox://styles/mapbox/dark-v11"
                    mapboxAccessToken={MAPBOX_TOKEN}
                    style={{ width: '100%', height: '100%' }}
                    terrain={{ source: 'mapbox-dem', exaggeration: 1.5 }} // Enable 3D terrain
                >
                    {/* 3D Terrain Source */}
                    <Source
                        id="mapbox-dem"
                        type="raster-dem"
                        url="mapbox://mapbox.mapbox-terrain-dem-v1"
                        tileSize={512}
                        maxzoom={14}
                    />

                    {/* Glowing Path Source & Layer */}
                    <Source id="route" type="geojson" data={geojsonData as any}>
                        <Layer
                            id="route-glow"
                            type="line"
                            paint={{
                                'line-color': '#00E5FF', // Electric Blue
                                'line-width': 8,
                                'line-blur': 12,
                                'line-opacity': 0.6
                            }}
                        />
                        <Layer
                            id="route-line"
                            type="line"
                            paint={{
                                'line-color': '#00BFA5', // Vibrant core
                                'line-width': 3,
                                'line-opacity': 0.9
                            }}
                        />
                    </Source>

                    {/* Draw Markers */}
                    {itinerary.days?.flatMap((day: any) => day.items || [])?.map((item: any, i: number) => {
                        const isActive = activeItem?.title === item.title;
                        const isStay = item.type.toLowerCase().includes('stay') || item.type.toLowerCase().includes('hotel');
                        const color = isStay ? COLORS.primary : COLORS.accent;

                        return (
                            <Marker key={i} longitude={item.lng} latitude={item.lat} anchor="bottom" onClick={(e) => {
                                e.originalEvent.stopPropagation();
                                setActiveItem(item);
                            }}>
                                <div style={{
                                    background: isActive ? color : COLORS.surface,
                                    border: `2px solid ${isActive ? '#FFF' : COLORS.border}`,
                                    color: isActive ? '#FFF' : COLORS.textMain,
                                    padding: isActive ? '8px 16px' : '6px 10px',
                                    borderRadius: 12,
                                    fontWeight: 800, fontSize: isActive ? '1rem' : '0.8rem',
                                    boxShadow: isActive ? `0 8px 24px ${color}80` : '0 4px 12px rgba(0,0,0,0.5)',
                                    cursor: 'pointer', whiteSpace: 'nowrap',
                                    transition: 'all 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
                                    transform: isActive ? 'scale(1.1) translateY(-4px)' : 'scale(1)',
                                    zIndex: isActive ? 10 : 1
                                }}>
                                    {isActive ? `★ ${item.title}` : `${i + 1}`}
                                </div>
                            </Marker>
                        );
                    })}

                    {/* Interactive 'Alive' Map Popups */}
                    {activeItem && (() => {
                        const priceData = fetchLivePricing(activeItem.title, activeItem.type, itinerary.destination);
                        return (
                            <Popup
                                longitude={activeItem.lng}
                                latitude={activeItem.lat}
                                anchor="top"
                                closeButton={false}
                                closeOnClick={false}
                                offset={18}
                                className="glass-popup"
                            >
                                <div style={{ padding: '4px', textAlign: 'center', minWidth: '200px' }}>
                                    <img src={getRealisticImageUrl(activeItem.title, activeItem.type)} alt={activeItem.title} style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '12px', marginBottom: '10px' }} />
                                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#FFF', marginBottom: '4px' }}>
                                        {activeItem.title}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                        <span style={{ fontSize: '0.8rem', color: '#FFD700' }}>⭐ {priceData.rating}</span>
                                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>• {priceData.provider}</span>
                                    </div>
                                    <div style={{ fontSize: '0.95rem', color: '#00E676', marginBottom: '12px', fontWeight: 800 }}>
                                        Deal: {formatINR(priceData.priceINR)}
                                    </div>
                                    <a
                                        href={generateAffiliateLink(activeItem.title, activeItem.type, itinerary.destination).url}
                                        target="_blank"
                                        rel="noreferrer"
                                        style={{
                                            display: 'block', padding: '10px 16px',
                                            background: '#00E676',
                                            color: '#000', borderRadius: '50px', fontSize: '0.85rem', fontWeight: 800,
                                            textDecoration: 'none', boxShadow: '0 4px 15px rgba(0,230,118,0.4)', transition: 'all 0.2s', textShadow: '0 0 2px rgba(255,255,255,0.5)'
                                        }}
                                        className="pulse-btn-vibrant"
                                    >
                                        ⚡ Quick Book
                                    </a>
                                </div>
                            </Popup>
                        );
                    })()}
                </Map>

                {/* Subtle vignette over the map for better contrast against floating UI */}
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, transparent 40%, rgba(18,18,20,0.7) 100%)', pointerEvents: 'none' }}></div>
            </div>

            {/* Floating Day-by-Day Timeline Overlay (Glassmorphism) */}
            <div style={{
                position: 'absolute', top: 32, bottom: 32, left: 32, width: 500,
                background: 'rgba(30,30,36,0.5)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
                border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 32,
                overflowY: 'auto', zIndex: 10, display: 'flex', flexDirection: 'column',
                boxShadow: '0 24px 64px rgba(0,0,0,0.4)', scrollbarWidth: 'none'
            }} className="hide-scroll">

                {/* Header (Sticky) */}
                <div style={{ position: 'sticky', top: 0, background: 'linear-gradient(to bottom, rgba(30,30,36,0.95), rgba(30,30,36,0.8))', backdropFilter: 'blur(12px)', padding: '32px 32px 24px', zIndex: 20, borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                        <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#FFF', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 50, transition: 'background 0.2s' }} className="hover-glass">
                            ← Home
                        </button>
                        <div style={{ background: `${COLORS.primary}20`, color: COLORS.primary, padding: '6px 12px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' }}>
                            AI Optimized Route
                        </div>
                    </div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: COLORS.textMain, margin: '0 0 8px', letterSpacing: '-1px' }}>{itinerary.destination}</h1>
                    <div style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>{itinerary.days?.length || 0} Days • {itinerary.estimatedCost || "Calculated"}</div>
                </div>

                {/* Timeline Content */}
                <div style={{ padding: '0 32px 32px' }}>
                    {itinerary.days?.map((day: any, dIdx: number) => (
                        <div key={dIdx} style={{ marginTop: 40 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                                <div style={{ height: 1, flex: 1, background: 'rgba(255,255,255,0.1)' }}></div>
                                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: COLORS.textMain, margin: 0, textTransform: 'uppercase', letterSpacing: 2 }}>{day.day}</h2>
                                <div style={{ height: 1, flex: 1, background: 'rgba(255,255,255,0.1)' }}></div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                {day.items?.map((item: any, iIdx: number) => {
                                    const isStay = item.type.toLowerCase().includes('stay') || item.type.toLowerCase().includes('hotel');
                                    const isFood = item.type.toLowerCase().includes('food') || item.type.toLowerCase().includes('restaurant') || item.type.toLowerCase().includes('dining');
                                    const isTransit = item.type.toLowerCase().includes('transit') || item.type.toLowerCase().includes('flight') || item.type.toLowerCase().includes('train');

                                    const isActive = activeItem?.title === item.title;
                                    const icon = isStay ? '🏨' : isFood ? '🍽️' : isTransit ? '✈️' : '📸';
                                    const color = isStay ? COLORS.primary : isTransit ? COLORS.secondary : isFood ? '#EAB308' : COLORS.accent;
                                    const imageUrl = getRealisticImageUrl(item.title, item.type);

                                    // Phase 4: Vibrant Deal Integration
                                    const liveDeal = fetchLivePricing(item.title, item.type, itinerary.destination);
                                    const affiliate = generateAffiliateLink(item.title, item.type, itinerary.destination);
                                    const isFree = liveDeal.priceINR === 0;
                                    const ctaGlowStyle = isActive ? { boxShadow: `0 0 20px rgba(0,230,118,0.5)`, background: '#00E676', color: '#000', textShadow: '0 0 2px rgba(255,255,255,0.5)' } : { background: color, color: '#FFF' };

                                    return (
                                        <div
                                            key={iIdx}
                                            onClick={() => setActiveItem(item)}
                                            style={{
                                                background: isActive ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.2)',
                                                border: `1px solid ${isActive ? '#00E676' : 'rgba(255,255,255,0.05)'}`,
                                                borderRadius: 24, padding: 20, cursor: 'pointer',
                                                display: 'flex', gap: 20, transition: 'all 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
                                                transform: isActive ? 'scale(1.02)' : 'scale(1)',
                                                boxShadow: isActive ? `0 12px 32px rgba(0,230,118,0.15)` : 'none',
                                                position: 'relative',
                                                overflow: 'hidden'
                                            }}
                                            className="hover-card"
                                        >
                                            {liveDeal.badge && (
                                                <div style={{
                                                    position: 'absolute', top: 12, left: -24,
                                                    background: 'linear-gradient(90deg, #FF9800, #F44336)',
                                                    color: '#FFF', fontSize: '0.65rem', fontWeight: 800,
                                                    padding: '4px 24px', transform: 'rotate(-45deg)',
                                                    textTransform: 'uppercase', letterSpacing: 1, boxShadow: '0 4px 12px rgba(244,67,54,0.4)',
                                                    zIndex: 2
                                                }}>
                                                    {liveDeal.badge}
                                                </div>
                                            )}

                                            <div style={{ width: 80, height: 80, borderRadius: 16, overflow: 'hidden', flexShrink: 0, zIndex: 1, position: 'relative' }}>
                                                <img src={imageUrl} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                <div style={{ position: 'absolute', bottom: 4, right: 4, background: 'rgba(0,0,0,0.7)', padding: '2px 6px', borderRadius: 6, fontSize: '0.65rem', color: '#FFD700', fontWeight: 800, backdropFilter: 'blur(4px)' }}>
                                                    ⭐ {liveDeal.rating}
                                                </div>
                                            </div>

                                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', zIndex: 1 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: isActive ? '#00E676' : color, textTransform: 'uppercase', letterSpacing: 1 }}>{icon} {item.type}</div>
                                                    <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{item.time}</div>
                                                </div>
                                                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#FFF', margin: '0 0 6px', lineHeight: 1.2 }}>{item.title}</h3>
                                                {isActive && item.desc && (
                                                    <p style={{ margin: '0 0 12px', fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>{item.desc}</p>
                                                )}

                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: isActive ? 'auto' : 0 }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                        {!isFree && <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Deal of the day</span>}
                                                        <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFF' }}>
                                                            {formatINR(liveDeal.priceINR)}
                                                        </span>
                                                    </div>

                                                    {isActive && (
                                                        <a href={affiliate.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{
                                                            padding: '8px 16px', borderRadius: 50, fontSize: '0.8rem', fontWeight: 800, textDecoration: 'none',
                                                            transition: 'all 0.2s ease',
                                                            ...ctaGlowStyle
                                                        }} className="pulse-btn-vibrant">
                                                            {affiliate.label}
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .hide-scroll::-webkit-scrollbar { display: none; }
                .hover-glass:hover { background: rgba(255,255,255,0.2) !important; }
                .hover-card:hover { background: rgba(255,255,255,0.1) !important; border-color: rgba(255,255,255,0.15) !important; }
                .pulse-btn:hover { transform: scale(1.05); filter: brightness(1.1); box-shadow: 0 0 20px rgba(255,255,255,0.4) !important; }
                .pulse-btn-vibrant:hover { transform: scale(1.05); filter: brightness(1.1); box-shadow: 0 0 25px rgba(0,230,118,0.8) !important; }
                
                /* Override Mapbox Popup default styles for Glassmorphism */
                .glass-popup .mapboxgl-popup-content {
                    background: rgba(30, 30, 36, 0.85);
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 16px;
                    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
                    padding: 12px;
                }
                .glass-popup .mapboxgl-popup-tip {
                    border-top-color: rgba(30, 30, 36, 0.85);
                }
            `}} />
        </div>
    );
}
