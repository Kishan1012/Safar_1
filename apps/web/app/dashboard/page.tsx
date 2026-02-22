"use client";

import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function Dashboard() {
    const { user, openAuthModal } = useAuthStore();
    const router = useRouter();
    const [savedTrips, setSavedTrips] = useState<any[]>([]);

    useEffect(() => {
        if (!user) {
            router.push('/');
            openAuthModal();
        } else {
            // Mock fetching saved trips
            setSavedTrips([
                { id: 1, destination: 'Goa', date: 'Oct 15 - Oct 20', total: 45000, img: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?q=80&w=400&auto=format&fit=crop' },
                { id: 2, destination: 'Bali', date: 'Dec 01 - Dec 10', total: 120000, img: 'https://images.unsplash.com/photo-1537996194454-04663eeb1c96?q=80&w=400&auto=format&fit=crop' }
            ]);
        }
    }, [user, router, openAuthModal]);

    if (!user) return null;

    return (
        <div style={{ minHeight: '100vh', padding: '120px 24px 40px', maxWidth: 1200, margin: '0 auto' }}>
            <motion.h1
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                style={{ fontSize: '3rem', fontWeight: 800, color: '#FFF', marginBottom: 8 }}
            >
                My Plans
            </motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} style={{ color: '#9CA3AF', fontSize: '1.1rem', marginBottom: 48 }}>
                Welcome back, {user.user_metadata?.full_name || 'Traveler'}. Here are your saved itineraries.
            </motion.p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
                {savedTrips.map((trip, idx) => (
                    <motion.div
                        key={trip.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 * idx }}
                        style={{
                            background: 'rgba(30,30,36,0.6)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 24,
                            overflow: 'hidden',
                            cursor: 'pointer',
                            transition: 'transform 0.3s, box-shadow 0.3s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.4)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                        <div style={{ width: '100%', height: 200, background: `url(${trip.img}) center/cover` }} />
                        <div style={{ padding: 24 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                <div>
                                    <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFF', margin: '0 0 4px' }}>{trip.destination}</h3>
                                    <div style={{ color: '#FF385C', fontWeight: 600, fontSize: '0.9rem' }}>{trip.date}</div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: 100, fontSize: '0.85rem', fontWeight: 700, color: '#FFF' }}>
                                    ₹{trip.total.toLocaleString()}
                                </div>
                            </div>
                            <button className="pulse-btn-vibrant" style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #FF3D00 0%, #FF00E5 100%)', color: '#FFF', borderRadius: 12, border: 'none', fontWeight: 700, cursor: 'pointer' }}>
                                View Itinerary
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
