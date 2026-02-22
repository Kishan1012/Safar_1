"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getWayAwayFlights, WayAwayFlight } from '../services/travelpayouts';
import { useTripBasket } from '../store/useTripBasket';
import { formatINR } from './livePricing';

export default function FlightSelection({ origin, destination, date, onBack, onNext }: { origin: string, destination: string, date: string, onBack: () => void, onNext: () => void }) {
    const [flights, setFlights] = useState<WayAwayFlight[]>([]);
    const [loading, setLoading] = useState(true);
    const { items: basketItems, toggleItem, getTotal } = useTripBasket();

    useEffect(() => {
        getWayAwayFlights(origin, destination, date).then(data => {
            setFlights(data);
            setLoading(false);
        });
    }, [origin, destination, date]);

    const isFlightSelected = (flightId: string) => basketItems.some(i => i.id === flightId);

    const handleSelect = (flight: WayAwayFlight) => {
        toggleItem({
            id: flight.id,
            title: `Flight: ${origin} to ${destination.split(',')[0]} (${flight.type})`,
            type: 'Flight',
            priceINR: flight.price
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
                ← Back to Itinerary
            </button>

            <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: 8, letterSpacing: '-1px' }}>Select Your Flight</h1>
            <p style={{ fontSize: '1.2rem', color: '#9CA3AF', marginBottom: 48 }}>Live routes from {origin} to {destination.split(',')[0]}</p>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                    <div style={{ display: 'inline-block', width: 48, height: 48, border: '4px solid #333338', borderTopColor: '#00E676', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                    <p style={{ marginTop: 24, fontSize: '1.1rem', color: '#9CA3AF' }}>Scanning WayAway for the best deals...</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 100 }}>
                    {flights.map((flight, idx) => {
                        const selected = isFlightSelected(flight.id);

                        return (
                            <motion.div
                                key={flight.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                style={{
                                    background: selected ? 'rgba(255, 0, 229, 0.1)' : 'rgba(30, 30, 36, 0.6)',
                                    border: `2px solid ${selected ? '#FF00E5' : 'rgba(255,255,255,0.05)'}`,
                                    borderRadius: 24, padding: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    backdropFilter: 'blur(16px)', boxShadow: selected ? '0 0 32px rgba(255, 0, 229, 0.2)' : '0 12px 32px rgba(0,0,0,0.3)',
                                    cursor: 'pointer', transition: 'all 0.3s'
                                }}
                                onClick={() => handleSelect(flight)}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                                    <img src={flight.airlineLogo} alt={flight.airline} style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'contain', background: '#FFF', padding: 8 }} />
                                    <div>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#FF9933', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{flight.type}</div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{flight.departure_time} — {flight.arrival_time}</div>
                                        <div style={{ fontSize: '1rem', color: '#9CA3AF', marginTop: 4 }}>{flight.airline} • {flight.duration}</div>
                                    </div>
                                </div>

                                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 }}>
                                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#FFF' }}>{formatINR(flight.price)}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <a href={flight.link} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ color: '#00E676', textDecoration: 'underline', fontSize: '0.9rem', fontWeight: 600 }}>Verify on WayAway</a>
                                        <div style={{
                                            width: 32, height: 32, borderRadius: '50%', border: `2px solid ${selected ? 'transparent' : '#666'}`,
                                            background: selected ? 'linear-gradient(135deg, #FF3D00 0%, #FF00E5 100%)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            transition: 'all 0.2s'
                                        }}>
                                            {selected ? <span style={{ color: '#FFF', fontWeight: 'bold', fontSize: '1.2rem', lineHeight: 1 }}>−</span> : <span style={{ color: '#FFF', fontWeight: 'bold', fontSize: '1.2rem', lineHeight: 1 }}>+</span>}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Sticky Continue Bar for Flights */}
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
                        Continue to Hotels →
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
