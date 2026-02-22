"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getLiveHotelDeals, HotelDeal } from '../services/travelpayouts';
import { useTripBasket } from '../store/useTripBasket';
import { formatINR } from './livePricing';

export default function HotelSelection({
    destination,
    date,
    budgetStyle,
    lastActivityLat,
    lastActivityLng,
    onBack,
    onNext
}: {
    destination: string,
    date: string,
    budgetStyle?: string,
    lastActivityLat?: number,
    lastActivityLng?: number,
    onBack: () => void,
    onNext: () => void
}) {
    const [hotels, setHotels] = useState<{ id: string, title: string, price: number, img: string, provider: string, link: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const { items: basketItems, toggleItem, getTotal } = useTripBasket();

    useEffect(() => {
        // In a fully robust app, we would pass lat/lng to a spatial search API.
        // For this demo, we'll fetch deals and visually brand them based on the budget vibe.

        getLiveHotelDeals().then(deals => {
            const destName = destination.split(',')[0];
            const basePrice = deals[0]?.price || 4000;
            const isBudget = budgetStyle?.toLowerCase().includes('budget');

            // Generate 3 dynamic hotel options based on coordinates & vibe
            const mockHotels = [
                {
                    id: 'hotel_1',
                    title: isBudget ? `OYO Townhouse near ${destName} Center` : `Agoda Premium Resort ${destName}`,
                    price: isBudget ? Math.round(basePrice * 0.4) : basePrice,
                    img: isBudget ? 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?q=80&w=800' : 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?q=80&w=800',
                    provider: isBudget ? 'OYO Rooms' : 'Agoda',
                    link: isBudget ? `https://www.oyorooms.com/search?location=${destName}` : `https://www.agoda.com/search?city=${destName}`
                },
                {
                    id: 'hotel_2',
                    title: isBudget ? `OYO Flagship (${latLngDistance(lastActivityLat, lastActivityLng)})` : `Agoda Grand Hotel (${latLngDistance(lastActivityLat, lastActivityLng)})`,
                    price: isBudget ? Math.round(basePrice * 0.35) : Math.round(basePrice * 1.2),
                    img: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=800',
                    provider: isBudget ? 'OYO Rooms' : 'Agoda',
                    link: isBudget ? `https://www.oyorooms.com/search?location=${destName}` : `https://www.agoda.com/search?city=${destName}`
                },
                {
                    id: 'hotel_3',
                    title: isBudget ? `Collection O by OYO ${destName}` : `Luxury Boutique Stay by Agoda`,
                    price: isBudget ? Math.round(basePrice * 0.5) : Math.round(basePrice * 2.5),
                    img: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=800',
                    provider: isBudget ? 'OYO Rooms' : 'Agoda',
                    link: isBudget ? `https://www.oyorooms.com/search?location=${destName}` : `https://www.agoda.com/search?city=${destName}`
                }
            ];

            setHotels(mockHotels);
            setLoading(false);
        });
    }, [destination, budgetStyle, lastActivityLat, lastActivityLng]);

    // Helper to fake a distance from the last activity if coords exist
    const latLngDistance = (lat?: number, lng?: number) => {
        if (!lat || !lng) return 'City Center';
        return '2km from last activity';
    };

    const isSelected = (hotelId: string) => basketItems.some(i => i.id === hotelId);

    const handleSelect = (hotel: typeof hotels[0]) => {
        toggleItem({
            id: hotel.id,
            title: hotel.title,
            type: 'Hotel',
            priceINR: hotel.price
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{ width: '100%', maxWidth: 900, margin: '0 auto', padding: '120px 20px 40px', color: '#FFF' }}
        >
            <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#FFF', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 50, marginBottom: 32, transition: 'background 0.2s' }}>
                ← Back to Flights
            </button>

            <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: 8, letterSpacing: '-1px' }}>Select Your Stay</h1>
            <p style={{ fontSize: '1.2rem', color: '#9CA3AF', marginBottom: 48 }}>Matching coordinates for <strong>{destination.split(',')[0]}</strong> • Vibe: {budgetStyle?.toLowerCase().includes('budget') ? 'Budget-Friendly' : 'Premium'}</p>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                    <div style={{ display: 'inline-block', width: 48, height: 48, border: '4px solid #333338', borderTopColor: '#00E676', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                    <p style={{ marginTop: 24, fontSize: '1.1rem', color: '#9CA3AF' }}>Finding the best stays near your activities...</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, marginBottom: 100 }}>
                    {hotels.map((hotel, idx) => {
                        const selected = isSelected(hotel.id);

                        return (
                            <motion.div
                                key={hotel.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.1 }}
                                style={{
                                    background: selected ? 'rgba(255, 0, 229, 0.1)' : 'rgba(30, 30, 36, 0.6)',
                                    border: `2px solid ${selected ? '#FF00E5' : 'rgba(255,255,255,0.05)'}`,
                                    borderRadius: 24, padding: '24px', display: 'flex', flexDirection: 'column', gap: 16,
                                    backdropFilter: 'blur(16px)', boxShadow: selected ? '0 0 32px rgba(255, 0, 229, 0.2)' : '0 12px 32px rgba(0,0,0,0.3)',
                                    cursor: 'pointer', transition: 'all 0.3s', position: 'relative'
                                }}
                                onClick={() => handleSelect(hotel)}
                            >
                                <div style={{
                                    width: 32, height: 32, borderRadius: '50%', border: `2px solid ${selected ? 'transparent' : 'rgba(255,255,255,0.2)'}`,
                                    background: selected ? 'linear-gradient(135deg, #FF3D00 0%, #FF00E5 100%)' : 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    position: 'absolute', top: 16, right: 16, zIndex: 10, transition: 'all 0.2s', backdropFilter: 'blur(4px)'
                                }}>
                                    {selected ? <span style={{ color: '#FFF', fontWeight: 'bold', fontSize: '1.2rem', lineHeight: 1 }}>−</span> : <span style={{ color: '#FFF', fontWeight: 'bold', fontSize: '1.2rem', lineHeight: 1 }}>+</span>}
                                </div>

                                <img src={hotel.img} alt={hotel.title} style={{ width: '100%', height: 180, borderRadius: 12, objectFit: 'cover' }} />

                                <div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#FF385C', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{hotel.provider}</div>
                                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 8px 0', lineHeight: 1.3 }}>{hotel.title}</h3>

                                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 16 }}>
                                        <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#FFF' }}>
                                            {formatINR(hotel.price)}
                                            <span style={{ fontSize: '0.9rem', color: '#9CA3AF', fontWeight: 400 }}> /night</span>
                                        </div>
                                    </div>

                                    <a href={hotel.link} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ display: 'block', color: '#00E676', fontSize: '0.9rem', fontWeight: 600, marginTop: 12, textDecoration: 'none' }}>
                                        View on {hotel.provider} →
                                    </a>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Sticky Continue Bar for Hotels */}
            {getTotal() > 0 && (
                <div style={{
                    position: 'fixed', bottom: 32, right: 32, left: 32, maxWidth: 900, margin: '0 auto',
                    background: 'rgba(30,30,36,0.85)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
                    border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 24, padding: '20px 32px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    boxShadow: '0 24px 64px rgba(0,0,0,0.5)', zIndex: 50
                }}>
                    <div>
                        <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Trip Total</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#FFF' }}>{formatINR(getTotal())}</div>
                    </div>
                    <button onClick={onNext} style={{
                        padding: '16px 32px', background: 'linear-gradient(135deg, #FF3D00 0%, #FF00E5 100%)', color: '#FFF', borderRadius: 50,
                        fontSize: '1.05rem', fontWeight: 800, border: 'none', cursor: 'pointer',
                        boxShadow: '0 8px 24px rgba(255,0,229,0.3)', transition: 'all 0.2s'
                    }}>
                        Add Insurance & Summary →
                    </button>
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes spin { 100% { transform: rotate(360deg); } }
            `}} />
        </motion.div>
    );
}
