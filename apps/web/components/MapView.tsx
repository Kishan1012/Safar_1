"use client";

import Map, { Marker, Popup, Source, Layer } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "pk.eyJ1Ijoia2lzaGFuc2luZ2gxMDEyMyIsImEiOiJjbWx3d2x1OGQwb2g2M2RwcXd0djh1bzdlIn0.XueJxn6rUS0BjWYZ9At0Tw";

const COLORS = {
    primary: '#FF385C',
    secondary: '#FF9933',
    accent: '#138808',
    surface: '#1E1E24',
    background: '#121214',
    textMain: '#F9FAFB',
    textMuted: '#9CA3AF',
    border: '#333338',
};

interface MapViewProps {
    viewState: any;
    onMove: (evt: any) => void;
    mapRef: React.RefObject<any>;
    geojsonData: any;
    itinerary: any;
    activeItem: any;
    setActiveItem: (item: any) => void;
    getRealisticImageUrl: (title: string, type: string) => string;
    fetchLivePricing: (title: string, type: string, dest: string) => any;
    formatINR: (price: number) => string;
    generateAffiliateLink: (title: string, type: string, dest: string) => any;
}

export default function MapView({
    viewState, onMove, mapRef, geojsonData,
    itinerary, activeItem, setActiveItem,
    getRealisticImageUrl, fetchLivePricing, formatINR, generateAffiliateLink
}: MapViewProps) {
    return (
        <Map
            ref={mapRef}
            {...viewState}
            onMove={onMove}
            mapStyle="mapbox://styles/mapbox/dark-v11"
            mapboxAccessToken={MAPBOX_TOKEN}
            style={{ width: '100%', height: '100%' }}
            terrain={{ source: 'mapbox-dem', exaggeration: 1.5 }}
        >
            <Source
                id="mapbox-dem"
                type="raster-dem"
                url="mapbox://mapbox.mapbox-terrain-dem-v1"
                tileSize={512}
                maxzoom={14}
            />

            <Source id="route" type="geojson" data={geojsonData as any}>
                <Layer
                    id="route-glow"
                    type="line"
                    paint={{ 'line-color': '#00E5FF', 'line-width': 8, 'line-blur': 12, 'line-opacity': 0.6 }}
                />
                <Layer
                    id="route-line"
                    type="line"
                    paint={{ 'line-color': '#00BFA5', 'line-width': 3, 'line-opacity': 0.9 }}
                />
            </Source>

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
                            borderRadius: 12, fontWeight: 800,
                            fontSize: isActive ? '1rem' : '0.8rem',
                            boxShadow: isActive ? `0 8px 24px ${color}80` : '0 4px 12px rgba(0,0,0,0.5)',
                            cursor: 'pointer', whiteSpace: 'nowrap' as const,
                            transition: 'all 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
                            transform: isActive ? 'scale(1.1) translateY(-4px)' : 'scale(1)',
                            zIndex: isActive ? 10 : 1
                        }}>
                            {isActive ? `★ ${item.title}` : `${i + 1}`}
                        </div>
                    </Marker>
                );
            })}

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
                                    background: '#00E676', color: '#000',
                                    borderRadius: '50px', fontSize: '0.85rem', fontWeight: 800,
                                    textDecoration: 'none', boxShadow: '0 4px 15px rgba(0,230,118,0.4)',
                                    transition: 'all 0.2s'
                                }}
                            >
                                ⚡ Quick Book
                            </a>
                        </div>
                    </Popup>
                );
            })()}
        </Map>
    );
}
