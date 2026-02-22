"use client";

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Map, { Marker, Popup, useMap, Source, Layer } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { generateAffiliateLink, AFFILIATE_ID } from '../utils/affiliate';
import { fetchLivePricing, formatINR } from './livePricing';
import { getLiveFlights, FlightDeal } from '../services/travelpayouts';
import { useTripBasket } from '../store/useTripBasket';
import FlightSelection from './FlightSelection';
import HotelSelection from './HotelSelection';
import PlaceDetailsModal from './PlaceDetailsModal';
import { fetchUnsplashImage } from '../services/unsplash';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "pk.eyJ1Ijoia2lzaGFuc2luZ2gxMDEyMyIsImEiOiJjbWx3d2x1OGQwb2g2M2RwcXd0djh1bzdlIn0.XueJxn6rUS0BjWYZ9At0Tw";

const COLORS = {
    primary: '#FF385C',
    secondary: '#FF9933',
    accent: '#138808',
    surface: '#1E1E24',
    background: '#121214',
    textMain: '#F9FAFB',
    textMuted: '#9CA3AF',
    border: '#333338'
};



const MOCK_ITINERARY = {
    destination: "Goa, India",
    days: [{
        day: "Day 1",
        date: "Nov 12, 2026",
        items: [
            { type: "Stay", title: "Baga Beach Resort", time: "12:00 PM", lat: 15.5553, lng: 73.7517 },
            { type: "Activity", title: "Lunch at Britto's", time: "1:30 PM", lat: 15.5600, lng: 73.7550 },
            { type: "Activity", title: "Chapora Fort Sunset", time: "5:00 PM", lat: 15.6053, lng: 73.7380 }
        ]
    }]
};

const normalizeItineraryData = (data: any) => {
    if (!data) return null;
    let parsed = data;
    if (Array.isArray(data) && data.length > 0) parsed = data[0];
    if (parsed.output && typeof parsed.output === 'string') {
        let cleanStr = parsed.output.replace(/```json\n/g, '').replace(/```\n?/g, '').trim();
        try { parsed = JSON.parse(cleanStr); } catch (e) {
            const endings = ['"]}]}', '"}]}', '}]}', ']}', '}', '"}', '"]}', ']}}', '}}', ']'];
            for (const ending of endings) {
                try { parsed = JSON.parse(cleanStr + ending); break; } catch (e2) { }
            }
        }
    }
    const rawItineraryArray = parsed.itinerary || (parsed.trip && parsed.trip.itinerary) || [];
    if (rawItineraryArray.length > 0 && !parsed.days) {
        parsed.days = rawItineraryArray.map((dayObj: any) => ({
            day: `Day ${dayObj.day || 1}`,
            date: dayObj.title || dayObj.theme || "",
            items: (dayObj.locations || dayObj.activities || []).map((act: any) => ({
                type: act.type || act.category || "Activity",
                title: act.name || act.title || "Destination",
                desc: act.description || "",
                time: act.time || act.timing || "",
                cost: act.cost || "Free",
                lat: act.location?.coordinates?.latitude || act.coordinates?.latitude || act.latitude || 15.6,
                lng: act.location?.coordinates?.longitude || act.coordinates?.longitude || act.longitude || 73.75
            }))
        }));
        if (parsed.trip && parsed.trip.destination) parsed.destination = parsed.trip.destination;
    }
    return parsed.days ? parsed : null;
};

// Sub-component to fetch and cache Unsplash imagery per activity on the fly
function ActivityImage({ title, type, dest, onClick }: { title: string, type: string, dest: string, onClick: () => void }) {
    const [url, setUrl] = useState("https://images.unsplash.com/photo-1506461883276-594540eb36cb?q=80&w=400&auto=format&fit=crop");

    useEffect(() => {
        fetchUnsplashImage(`${title} ${type} ${dest}`, 'squarish').then(setUrl);
    }, [title, type, dest]);

    return (
        <div style={{ width: 80, height: 80, borderRadius: 16, overflow: 'hidden', flexShrink: 0, cursor: 'pointer', zIndex: 2 }} onClick={onClick}>
            <img src={url} alt={title} className="activity-img" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }} />
        </div>
    );
}

export default function ItineraryResults({ onBack, itineraryData, origin, budget }: { onBack: () => void, itineraryData?: any, origin?: string, budget?: string }) {
    const itinerary = normalizeItineraryData(itineraryData) || MOCK_ITINERARY;
    const { items: basketItems, toggleItem, setItems, addItem, getTotal } = useTripBasket();
    const [view, setView] = useState<'itinerary' | 'flights' | 'hotels' | 'summary'>('itinerary');
    const hasAutoSelected = useRef(false);

    // Find last activity coordinates for hotels/zoom panning
    const lastActivity = basketItems.filter(i => i.type.toLowerCase().includes('activity')).pop();
    let lastLat = itinerary.days?.[0]?.items?.[0]?.lat || 15.6;
    let lastLng = itinerary.days?.[0]?.items?.[0]?.lng || 73.75;

    if (lastActivity) {
        itinerary.days?.forEach((d: any) => d.items?.forEach((i: any) => {
            if (i.title === lastActivity.title) { lastLat = i.lat; lastLng = i.lng; }
        }));
    }

    const [viewState, setViewState] = useState({ longitude: lastLng, latitude: lastLat, zoom: 11 });
    const [activeItem, setActiveItem] = useState<any>(null);
    const [modalItem, setModalItem] = useState<any>(null);
    const [heroImg, setHeroImg] = useState("");
    const mapRef = useRef<any>(null);
    const [flightData, setFlightData] = useState<FlightDeal | null>(null);
    const [isMobile, setIsMobile] = useState(false);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [calibratedPins, setCalibratedPins] = useState<Record<string, { lat: number, lng: number }>>({});

    useEffect(() => {
        console.log("Google Maps Services: Active");
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        if (itinerary.destination) {
            fetchUnsplashImage(`${itinerary.destination} city landscape`, 'landscape').then(setHeroImg);
        }
    }, [itinerary.destination]);

    useEffect(() => {
        const calibratePins = async () => {
            const toCalibrate = ["Heritage Walk", "Ganga Aarti"];
            if (!itinerary.days) return;

            for (const day of itinerary.days) {
                for (const item of day.items || []) {
                    if (toCalibrate.some(t => item.title.includes(t)) && !calibratedPins[item.title]) {
                        try {
                            const res = await fetch(`/api/places/geocode?q=${encodeURIComponent(item.title + ' ' + itinerary.destination)}`);
                            const data = await res.json();
                            if (data.lat && data.lng) {
                                setCalibratedPins(prev => ({ ...prev, [item.title]: { lat: data.lat, lng: data.lng } }));
                            }
                        } catch (e) {
                            console.error("Failed to calibrate pin:", e);
                        }
                    }
                }
            }
        };
        calibratePins();
    }, [itinerary.days, itinerary.destination]);

    useEffect(() => {
        if (origin && itinerary.destination) {
            getLiveFlights(origin, itinerary.destination.split(',')[0]).then(res => setFlightData(res));
        }
    }, [origin, itinerary.destination]);
    useEffect(() => {
        if (!hasAutoSelected.current && itinerary.days && itinerary.days.length > 0) {
            hasAutoSelected.current = true;

            // 1. Pick all activities
            const newBasket: any[] = [];
            itinerary.days.forEach((day: any, dIdx: number) => {
                day.items?.forEach((item: any, iIdx: number) => {
                    const isActivity = !item.type.toLowerCase().includes('stay') && !item.type.toLowerCase().includes('hotel') && !item.type.toLowerCase().includes('transit');
                    if (isActivity) {
                        const liveDeal = fetchLivePricing(item.title, item.type, itinerary.destination);
                        newBasket.push({
                            id: `${dIdx}-${iIdx}-${item.title}`,
                            title: item.title,
                            type: item.type,
                            priceINR: liveDeal.priceINR
                        });
                    }
                });
            });
            setItems(newBasket);

            // 2. Add Top Flight async
            if (origin && itinerary.destination) {
                import('../services/travelpayouts').then(({ getWayAwayFlights }) => {
                    getWayAwayFlights(origin, itinerary.destination, itinerary.days[0]?.date || '').then(flights => {
                        if (flights.length > 0) {
                            addItem({
                                id: flights[0].id,
                                title: `Flight: ${origin} to ${itinerary.destination.split(',')[0]} (${flights[0].type})`,
                                type: 'Flight',
                                priceINR: flights[0].price
                            });
                        }
                    });
                });
            }

            // 3. Add Top Hotel async
            import('../services/travelpayouts').then(({ getLiveHotelDeals }) => {
                getLiveHotelDeals().then(deals => {
                    const basePrice = deals[0]?.price || 4000;
                    const destName = itinerary.destination.split(',')[0];
                    const isBudget = budget?.toLowerCase().includes('budget');

                    addItem({
                        id: 'hotel_1',
                        title: isBudget ? `OYO Townhouse near ${destName} Center` : `Agoda Premium Resort ${destName}`,
                        type: 'Hotel',
                        priceINR: isBudget ? Math.round(basePrice * 0.4) : basePrice
                    });
                });
            });
        }
    }, [itinerary, origin, budget, setItems, addItem]);

    const routeCoordinates = itinerary.days.flatMap((day: any) => day.items.map((item: any) => [calibratedPins[item.title]?.lng || item.lng, calibratedPins[item.title]?.lat || item.lat]));

    // MAP INTERACTION: Persistent Map FlyTo updates
    useEffect(() => {
        if (mapRef.current) {
            const verticalOffset: [number, number] = [0, isMobile ? -150 : 0]; // Keep pins in top 40% on mobile

            if (view === 'hotels') {
                // Fly to the last known activity (or center) for hotel view
                mapRef.current.getMap().flyTo({ center: [lastLng, lastLat], zoom: 14, pitch: 45, duration: 2500, essential: true, offset: verticalOffset });
            } else if (view === 'itinerary' && activeItem) {
                // Fly to active item on the map
                mapRef.current.getMap().flyTo({ center: [activeItem.lng, activeItem.lat], zoom: 14, pitch: 60, bearing: -20, duration: 2500, essential: true, offset: verticalOffset });
            } else if (view === 'itinerary' && !activeItem && routeCoordinates.length > 0) {
                // Cinematic rotation
                const map = mapRef.current.getMap();
                let currentBearing = map.getBearing();
                const rotateCamera = () => {
                    if (view !== 'itinerary' || activeItem) return;
                    map.easeTo({
                        bearing: currentBearing += 15,
                        pitch: 65,
                        duration: 5000,
                        easing: (t: number) => t // linear
                    });
                    map.once('moveend', rotateCamera);
                };
                map.flyTo({ center: [lastLng, lastLat], zoom: 12.5, pitch: 65, duration: 3000, offset: verticalOffset });
                map.once('moveend', rotateCamera);

                return () => {
                    map.off('moveend', rotateCamera);
                    map.stop();
                };
            }
        }
    }, [activeItem, view, lastLat, lastLng, routeCoordinates.length, isMobile]);

    // Cinematic page-slide variants
    const slideVariants = {
        initial: { opacity: 0, x: 50 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -50 }
    };

    return (
        <div style={{ position: 'relative', width: '100%', height: '100vh', background: COLORS.background, overflow: 'hidden' }}>

            {/* 1. LAYER ONE: Persistent Interactive Map Base */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
                <Map
                    ref={mapRef}
                    {...viewState}
                    onMove={evt => setViewState(evt.viewState)}
                    mapStyle="mapbox://styles/mapbox/dark-v11"
                    mapboxAccessToken={MAPBOX_TOKEN}
                    style={{ width: '100%', height: '100%' }}
                    terrain={{ source: 'mapbox-dem', exaggeration: 1.5 }}
                >
                    <Source id="mapbox-dem" type="raster-dem" url="mapbox://mapbox.mapbox-terrain-dem-v1" tileSize={512} maxzoom={14} />
                    <Layer id="sky" type="sky" paint={{ 'sky-type': 'atmosphere', 'sky-atmosphere-sun': [0.0, 90.0], 'sky-atmosphere-sun-intensity': 15 }} />
                    <Source id="route" type="geojson" data={{ type: 'Feature', geometry: { type: 'LineString', coordinates: routeCoordinates } } as any}>
                        <Layer id="route-glow" type="line" paint={{ 'line-color': '#FF00E5', 'line-width': 8, 'line-blur': 12, 'line-opacity': 0.6 }} />
                        <Layer id="route-line" type="line" paint={{ 'line-color': '#FF3D00', 'line-width': 3, 'line-opacity': 0.9 }} />
                    </Source>

                    {itinerary.days?.flatMap((day: any) => day.items || [])?.map((item: any, i: number) => {
                        const isActive = activeItem?.title === item.title;
                        const isStay = item.type.toLowerCase().includes('stay') || item.type.toLowerCase().includes('hotel');
                        const color = isStay ? COLORS.primary : COLORS.accent;
                        const lat = calibratedPins[item.title]?.lat || item.lat;
                        const lng = calibratedPins[item.title]?.lng || item.lng;
                        return (
                            <Marker key={i} longitude={lng} latitude={lat} anchor="bottom" onClick={(e) => { e.originalEvent.stopPropagation(); setActiveItem(item); }}>
                                <div style={{
                                    background: isActive ? color : COLORS.surface, border: `2px solid ${isActive ? '#FFF' : COLORS.border}`,
                                    color: isActive ? '#FFF' : COLORS.textMain, padding: isActive ? '8px 16px' : '6px 10px',
                                    borderRadius: 12, fontWeight: 800, fontSize: isActive ? '1rem' : '0.8rem',
                                    boxShadow: isActive ? `0 8px 24px ${color}80` : '0 4px 12px rgba(0,0,0,0.5)',
                                    cursor: 'pointer', transition: 'all 0.3s', transform: isActive ? 'scale(1.1) translateY(-4px)' : 'scale(1)', zIndex: isActive ? 10 : 1
                                }}>
                                    {isActive ? `★ ${item.title}` : `${i + 1}`}
                                </div>
                            </Marker>
                        );
                    })}

                    {activeItem && (() => {
                        const priceData = fetchLivePricing(activeItem.title, activeItem.type, itinerary.destination);
                        return (
                            <Popup longitude={activeItem.lng} latitude={activeItem.lat} anchor="top" closeButton={false} closeOnClick={false} offset={18} className="glass-popup">
                                <div style={{ padding: '4px', textAlign: 'center', minWidth: '200px' }}>
                                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#FFF', marginBottom: '4px' }}>{activeItem.title}</div>
                                    <div style={{ fontSize: '0.95rem', color: '#00E676', marginBottom: '4px', fontWeight: 800 }}>Deal: {formatINR(priceData.priceINR)}</div>
                                </div>
                            </Popup>
                        );
                    })()}
                </Map>
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, transparent 30%, rgba(10,10,12,0.85) 100%)', pointerEvents: 'none', transition: 'all 0.5s', opacity: view === 'itinerary' ? 1 : 0.9 }}></div>
                {view !== 'itinerary' && <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(10,10,12,0.6)', backdropFilter: 'blur(12px)', pointerEvents: 'none', transition: 'all 0.5s' }}></div>}
            </div>

            {/* 2. LAYER TWO: Foreground UI Router with Framer Motion slide transitions */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none', overflowY: 'auto', overflowX: 'hidden' }}>
                <AnimatePresence mode="wait">

                    {view === 'itinerary' && (
                        <motion.div key="itinerary" variants={slideVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.3 }} style={{ position: 'relative', width: '100%', minHeight: '100%', pointerEvents: 'none' }}>
                            <motion.div
                                drag={isMobile ? "y" : false}
                                dragConstraints={{ top: 0, bottom: 0 }}
                                dragElastic={0.2}
                                onDragEnd={(e, info) => {
                                    if (isMobile) {
                                        if (info.offset.y < -50 || info.velocity.y < -500) setSheetOpen(true);
                                        else if (info.offset.y > 50 || info.velocity.y > 500) setSheetOpen(false);
                                    }
                                }}
                                animate={isMobile ? { y: sheetOpen ? 0 : "65vh" } : { y: 0 }}
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                style={{
                                    position: 'absolute',
                                    ...(isMobile ? {
                                        bottom: 0, left: 0, right: 0, height: '85vh', paddingTop: 0, paddingBottom: 0, zIndex: 40
                                    } : {
                                        top: 0, bottom: 0, left: 32, width: 500, paddingTop: 32, paddingBottom: 32, zIndex: 20
                                    }),
                                    pointerEvents: 'auto'
                                }}
                            >
                                <div style={{
                                    height: '100%', background: 'rgba(30,30,36,0.3)', backdropFilter: 'blur(20px)', border: `1px solid rgba(255,255,255,0.1)`,
                                    borderRadius: isMobile ? '32px 32px 0 0' : 32, overflowY: 'auto', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.4)', scrollbarWidth: 'none',
                                    paddingBottom: isMobile ? 120 : 0 // space for sticky button inside sheet
                                }} className="hide-scroll">
                                    {isMobile && (
                                        <div onClick={() => setSheetOpen(!sheetOpen)} style={{ padding: '12px 0', background: 'rgba(30,30,36,0.95)', position: 'sticky', top: 0, zIndex: 30, borderRadius: '32px 32px 0 0', cursor: 'grab' }}>
                                            <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,0.3)', borderRadius: 4, margin: '0 auto' }} />
                                        </div>
                                    )}
                                    <div style={{ position: 'sticky', top: isMobile ? 28 : 0, padding: isMobile ? '16px 20px 20px' : '32px 32px 24px', zIndex: 20, minHeight: isMobile ? 120 : 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', overflow: 'hidden', borderBottom: `1px solid rgba(255,255,255,0.05)`, borderRadius: isMobile ? '0' : '32px 32px 0 0' }}>
                                        <div style={{ position: 'absolute', inset: 0, background: heroImg ? `url(${heroImg}) center/cover` : '#1E1E24', transition: 'background 0.5s' }} />
                                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(30,30,36,0.2) 0%, rgba(30,30,36,0.95) 100%)' }} />
                                        <div style={{ position: 'relative', zIndex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? 16 : 24 }}>
                                                <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', border: 'none', color: '#FFF', cursor: 'pointer', padding: isMobile ? '6px 12px' : '8px 16px', borderRadius: 50, fontWeight: 600, fontSize: isMobile ? '0.85rem' : '0.95rem' }}>← Home</button>
                                            </div>
                                            <h1 style={{ fontSize: isMobile ? '1.8rem' : '2.5rem', fontWeight: 800, color: COLORS.textMain, margin: '0 0 8px', letterSpacing: '-1px' }}>{itinerary.destination}</h1>
                                            <div style={{ fontSize: isMobile ? '0.9rem' : '1rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>{itinerary.days?.length || 0} Days • Optimized Route</div>
                                        </div>
                                    </div>
                                    <div style={{ padding: isMobile ? '0 20px 20px' : '0 32px 32px' }}>
                                        {itinerary.days?.map((day: any, dIdx: number) => (
                                            <div key={dIdx} style={{ marginTop: 40 }}>
                                                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: COLORS.textMain, marginBottom: 24 }}>{day.day}</h2>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                                    {day.items?.map((item: any, iIdx: number) => {
                                                        const isActivity = !item.type.toLowerCase().includes('stay') && !item.type.toLowerCase().includes('hotel') && !item.type.toLowerCase().includes('transit');
                                                        const isActive = activeItem?.title === item.title;
                                                        const basketId = `${dIdx}-${iIdx}-${item.title}`;
                                                        const itemInBasket = basketItems.some((i: any) => i.id === basketId);
                                                        const liveDeal = fetchLivePricing(item.title, item.type, itinerary.destination);

                                                        // 15% scaling logic for mobile cards
                                                        return (
                                                            <div key={iIdx} onClick={() => setActiveItem(item)} style={{
                                                                background: isActive ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.2)',
                                                                border: `2px solid ${itemInBasket ? '#00E676' : isActive ? '#FF385C' : 'rgba(255,255,255,0.05)'}`,
                                                                borderRadius: isMobile ? 24 : 24, padding: isMobile ? 16 : 20, cursor: 'pointer', display: 'flex', gap: isMobile ? 16 : 20, transition: 'all 0.3s',
                                                                transform: isActive ? 'scale(1.02)' : 'scale(1)',
                                                                boxShadow: itemInBasket ? `0 0 20px rgba(0,230,118,0.3)` : isActive ? `0 12px 32px rgba(255,56,92,0.15)` : 'none',
                                                                position: 'relative', overflow: 'hidden'
                                                            }} className="hover-card">
                                                                {/* Subtle Sunset Gradient Overlay */}
                                                                <div className="sunset-overlay" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,61,0,0.08) 0%, rgba(255,0,229,0.08) 100%)', opacity: 0, pointerEvents: 'none', transition: 'opacity 0.4s ease' }} />

                                                                {isActivity && (
                                                                    <div onClick={(e) => { e.stopPropagation(); toggleItem({ id: basketId, title: item.title, type: item.type, priceINR: liveDeal.priceINR }); }} style={{
                                                                        position: 'absolute', top: isMobile ? 12 : 16, right: isMobile ? 12 : 16, width: isMobile ? 36 : 28, height: isMobile ? 36 : 28, borderRadius: isMobile ? 12 : 8,
                                                                        border: `2px solid ${itemInBasket ? 'transparent' : 'rgba(255,255,255,0.3)'}`, background: itemInBasket ? 'linear-gradient(135deg, #FF3D00 0%, #FF00E5 100%)' : 'rgba(0,0,0,0.4)',
                                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, transition: 'all 0.2s'
                                                                    }}>
                                                                        {itemInBasket ? <span style={{ color: '#FFF', fontWeight: 'bold', fontSize: isMobile ? '1.5rem' : '1.2rem', lineHeight: 1 }}>−</span> : <span style={{ color: '#FFF', fontWeight: 'bold', fontSize: isMobile ? '1.4rem' : '1.2rem', lineHeight: 1 }}>+</span>}
                                                                    </div>
                                                                )}
                                                                <ActivityImage title={item.title} type={item.type} dest={itinerary.destination} onClick={(e: any) => { e?.stopPropagation(); setModalItem(item); }} />
                                                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', zIndex: 2 }}>
                                                                    <div style={{ fontSize: isMobile ? '0.7rem' : '0.75rem', fontWeight: 800, color: '#00E676', textTransform: 'uppercase' }}>{item.type}</div>
                                                                    <h3 onClick={(e) => { e.stopPropagation(); setModalItem(item); }} className="hover-title" style={{ fontSize: isMobile ? '1.05rem' : '1.2rem', fontWeight: 700, color: '#FFF', margin: '4px 0', lineHeight: 1.2, cursor: 'pointer', display: 'inline-block', paddingRight: isMobile ? 32 : 0 }}>{item.title}</h3>
                                                                    <div style={{ fontSize: isMobile ? '0.95rem' : '1.05rem', fontWeight: 800, color: '#FFF', marginTop: 'auto' }}>{formatINR(liveDeal.priceINR)}</div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Sticky Progress Bar Overlay INSIDE the sheet to fix Z-index scrolling */}
                                    {getTotal() > 0 && isMobile && (
                                        <div style={{
                                            position: 'absolute',
                                            bottom: 0,
                                            left: 0,
                                            right: 0,
                                            pointerEvents: 'auto',
                                            background: 'rgba(30,30,36,0.95)', backdropFilter: 'blur(24px)',
                                            borderTop: `1px solid rgba(255,255,255,0.1)`,
                                            padding: '16px 24px calc(16px + env(safe-area-inset-bottom))',
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                                            boxShadow: '0 -10px 40px rgba(0,0,0,0.5)', zIndex: 50
                                        }}>
                                            <div>
                                                <div style={{ fontSize: '0.80rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Trip Total</div>
                                                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFF' }}>{formatINR(getTotal())}</div>
                                            </div>
                                            <button onClick={() => setView('flights')} style={{ padding: '12px 20px', flex: 1, background: 'linear-gradient(135deg, #FF3D00 0%, #FF00E5 100%)', color: '#FFF', borderRadius: 50, fontSize: '0.95rem', fontWeight: 800, border: 'none', cursor: 'pointer', transition: 'all 0.2s' }} className="pulse-btn-vibrant">
                                                Continue →
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </motion.div>

                            {/* Sticky Progress Bar Overlay Desktop */}
                            {getTotal() > 0 && !isMobile && (
                                <div style={{
                                    position: 'fixed',
                                    bottom: 32,
                                    right: 32,
                                    pointerEvents: 'auto',
                                    background: 'rgba(30,30,36,0.85)', backdropFilter: 'blur(24px)',
                                    border: `1px solid rgba(255,255,255,0.1)`,
                                    borderRadius: 24,
                                    padding: '20px 32px',
                                    display: 'flex', alignItems: 'center', gap: 32,
                                    boxShadow: '0 24px 64px rgba(0,0,0,0.5)', zIndex: 50
                                }}>
                                    <div>
                                        <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Trip Total</div>
                                        <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#FFF' }}>{formatINR(getTotal())}</div>
                                    </div>
                                    <button onClick={() => setView('flights')} style={{ padding: '16px 32px', background: 'linear-gradient(135deg, #FF3D00 0%, #FF00E5 100%)', color: '#FFF', borderRadius: 50, fontSize: '1.05rem', fontWeight: 800, border: 'none', cursor: 'pointer', transition: 'all 0.2s' }} className="pulse-btn-vibrant">
                                        Continue to Flights →
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {view === 'flights' && (
                        <motion.div key="flights" variants={slideVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.4 }} style={{ position: 'absolute', inset: 0, overflowY: 'auto', pointerEvents: 'auto' }}>
                            <FlightSelection origin={origin || 'New York'} destination={itinerary.destination} date={itinerary.days?.[0]?.date || ''} onBack={() => setView('itinerary')} onNext={() => setView('hotels')} />
                        </motion.div>
                    )}

                    {view === 'hotels' && (
                        <motion.div key="hotels" variants={slideVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.4 }} style={{ position: 'absolute', inset: 0, overflowY: 'auto', pointerEvents: 'auto' }}>
                            <HotelSelection destination={itinerary.destination} date={itinerary.days?.[0]?.date || ''} budgetStyle={budget} lastActivityLat={lastLat} lastActivityLng={lastLng} onBack={() => setView('flights')} onNext={() => setView('summary')} />
                        </motion.div>
                    )}

                    {view === 'summary' && (
                        <motion.div key="summary" variants={slideVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.4 }} style={{ position: 'absolute', inset: 0, overflowY: 'auto', pointerEvents: 'auto' }}>
                            <SummarySelection destination={itinerary.destination} onBack={() => setView('hotels')} />
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>

            {modalItem && (
                <PlaceDetailsModal
                    title={modalItem.title}
                    type={modalItem.type}
                    destination={itinerary.destination}
                    onClose={() => setModalItem(null)}
                    isSaved={basketItems.some((i: any) => i.id === `${itinerary.days?.findIndex((d: any) => d.items?.includes(modalItem))}-${itinerary.days?.find((d: any) => d.items?.includes(modalItem))?.items?.indexOf(modalItem)}-${modalItem.title}`)}
                    onSave={() => {
                        const dIdx = itinerary.days?.findIndex((d: any) => d.items?.includes(modalItem));
                        const iIdx = itinerary.days?.find((d: any) => d.items?.includes(modalItem))?.items?.indexOf(modalItem);
                        const liveDeal = fetchLivePricing(modalItem.title, modalItem.type, itinerary.destination);
                        toggleItem({ id: `${dIdx}-${iIdx}-${modalItem.title}`, title: modalItem.title, type: modalItem.type, priceINR: liveDeal.priceINR });
                    }}
                />
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
                .hide-scroll::-webkit-scrollbar { display: none; }
                .hover-card { transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.4s ease, border-color 0.4s ease; transform-style: preserve-3d; }
                .hover-card:hover { 
                    transform: perspective(1000px) rotateX(5deg) rotateY(-5deg) scale(1.03) !important; 
                    box-shadow: -10px 20px 30px rgba(0, 229, 255, 0.15), 0 0 20px rgba(0, 229, 255, 0.2) !important; 
                    border-color: rgba(0, 229, 255, 0.4) !important;
                    background: rgba(40,40,46,0.95) !important;
                }
                .hover-card:hover .sunset-overlay { opacity: 1 !important; }
                .hover-card:hover .activity-img { transform: scale(1.15); }
                .hover-title:hover { color: #FF00E5 !important; text-decoration: underline; }
                .pulse-btn-vibrant:hover { transform: scale(1.05); filter: brightness(1.1); box-shadow: 0 0 25px rgba(255,0,229,0.8) !important; }
                .glass-popup .mapboxgl-popup-content { background: rgba(30, 30, 36, 0.85); backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; padding: 12px; }
                .glass-popup .mapboxgl-popup-tip { border-top-color: rgba(30, 30, 36, 0.85); }
            `}} />
        </div>
    );
}
