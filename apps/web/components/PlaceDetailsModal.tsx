"use client";

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { fetchGooglePlaceDetails, GooglePlaceDetails } from '../services/googlePlaces';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../utils/supabase';

interface PlaceDetailsModalProps {
    title: string;
    type: string;
    destination: string;
    onClose: () => void;
    onSave?: () => void;
    isSaved?: boolean;
}

export default function PlaceDetailsModal({ title, type, destination, onClose, onSave, isSaved }: PlaceDetailsModalProps) {
    const [details, setDetails] = useState<GooglePlaceDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeImage, setActiveImage] = useState(0);
    const { user, openAuthModal } = useAuthStore();
    const [isSaving, setIsSaving] = useState(false);

    const handleSaveTrip = async () => {
        if (!user) {
            openAuthModal();
            return;
        }

        setIsSaving(true);
        // Save the currently selected context (mocking trip_basket)
        if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
            await supabase.from('user_trips').insert([{
                user_id: user.id,
                destination: destination,
                title: title,
                img: details?.photos[0] || '',
                created_at: new Date()
            }]);
        } else {
            await new Promise(r => setTimeout(r, 800)); // Simulate save
        }
        setIsSaving(false);
        alert('Saved to My Plans! ✅');
    };

    useEffect(() => {
        fetchGooglePlaceDetails(title, type, destination).then(data => {
            setDetails(data);
            setLoading(false);
        });
    }, [title, type, destination]);

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px'
        }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={onClose} />

            <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                style={{
                    position: 'relative', width: '100%', maxWidth: 600, maxHeight: '90vh', background: '#1E1E24',
                    borderRadius: 24, overflow: 'hidden', display: 'flex', flexDirection: 'column',
                    boxShadow: '0 32px 64px rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)'
                }}
            >
                <button onClick={onClose} style={{
                    position: 'absolute', top: 16, left: 16, zIndex: 10, width: 36, height: 36, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', color: '#FFF',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(4px)'
                }}>✕</button>

                {loading ? (
                    <div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}>
                        Loading intelligence...
                    </div>
                ) : details && (
                    <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column' }} className="hide-scroll">
                        {/* Hero Gallery Carousel */}
                        <div style={{ position: 'relative', width: '100%', height: 300, background: '#000' }}>
                            <img src={details.photos[activeImage]} alt={details.name} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'all 0.4s' }} />
                            <div style={{ position: 'absolute', bottom: 16, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 8 }}>
                                {details.photos.map((_, idx) => (
                                    <div key={idx} onClick={() => setActiveImage(idx)} style={{
                                        width: 8, height: 8, borderRadius: '50%', cursor: 'pointer',
                                        background: activeImage === idx ? '#FFF' : 'rgba(255,255,255,0.4)', transition: 'all 0.2s'
                                    }} />
                                ))}
                            </div>
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 100, background: 'linear-gradient(to top, rgba(30,30,36,1), transparent)' }} />
                        </div>

                        <div style={{ padding: '0 24px 24px', marginTop: '-40px', position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
                            {/* Header & Stats */}
                            <div>
                                <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#FFF', marginBottom: 8, lineHeight: 1.1 }}>{details.name}</h2>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#9CA3AF', fontSize: '0.95rem' }}>
                                    <span style={{ color: '#FFD700', fontWeight: 800, fontSize: '1.1rem' }}>⭐ {details.rating}</span>
                                    <span>({details.user_ratings_total} Google reviews)</span>
                                    <span>•</span>
                                    <span>{type}</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                {onSave && (
                                    <button onClick={onSave} style={{
                                        flex: 1, minWidth: 140, padding: '12px', background: isSaved ? 'rgba(255, 0, 229, 0.1)' : 'rgba(255,255,255,0.05)',
                                        border: `1px solid ${isSaved ? '#FF00E5' : 'rgba(255,255,255,0.1)'}`, color: isSaved ? '#FF00E5' : '#FFF',
                                        borderRadius: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                                    }}>
                                        {isSaved ? '− Remove from Trip' : '+ Add to Trip'}
                                    </button>
                                )}
                                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(details.name + ' ' + destination)}`} target="_blank" rel="noreferrer" style={{
                                    flex: 1, minWidth: 140, padding: '12px', background: 'rgba(255,255,255,0.1)',
                                    border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', borderRadius: 12, fontWeight: 700, cursor: 'pointer', textDecoration: 'none',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                                }}>
                                    📍 Directions
                                </a>
                                <button onClick={handleSaveTrip} disabled={isSaving} className="pulse-btn-vibrant" style={{
                                    flex: '1 1 100%', minWidth: 200, padding: '12px', background: 'linear-gradient(135deg, #FF3D00 0%, #FF00E5 100%)',
                                    border: 'none', color: '#FFF', borderRadius: 12, fontWeight: 700, cursor: isSaving ? 'wait' : 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 16px rgba(255,0,229,0.3)', opacity: isSaving ? 0.7 : 1
                                }}>
                                    {isSaving ? 'Saving...' : '💾 Save to My Plans'}
                                </button>
                            </div>

                            {/* About */}
                            <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: 20 }}>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FFF', marginBottom: 8 }}>About this place</h3>
                                <p style={{ color: '#9CA3AF', lineHeight: 1.6, fontSize: '0.95rem' }}>{details.editorial_summary}</p>
                            </div>

                            {/* Live Data */}
                            <div style={{ display: 'flex', gap: 16 }}>
                                <div style={{ flex: 1, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: 16 }}>
                                    <div style={{ fontSize: '0.85rem', color: '#9CA3AF', marginBottom: 4 }}>Status</div>
                                    <div style={{ color: details.opening_hours.open_now ? '#00E676' : '#FF385C', fontWeight: 700 }}>
                                        {details.opening_hours.open_now ? 'Open Now' : 'Closed'}
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: '#666', marginTop: 4 }}>{details.opening_hours.weekday_text[0].split(': ')[1]}</div>
                                </div>
                                <div style={{ flex: 1, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: 16 }}>
                                    <div style={{ fontSize: '0.85rem', color: '#9CA3AF', marginBottom: 4 }}>Contact</div>
                                    <div style={{ color: '#FFF', fontWeight: 600, fontSize: '0.95rem' }}>{details.formatted_phone_number}</div>
                                </div>
                            </div>

                            {/* Community Notes */}
                            <div>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FFF', marginBottom: 16 }}>Community Notes</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    {details.reviews.map((rev, idx) => (
                                        <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 12 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                <div style={{ fontWeight: 600, color: '#FFF', fontSize: '0.9rem' }}>{rev.author_name}</div>
                                                <div style={{ color: '#FFD700', fontSize: '0.8rem' }}>{'⭐'.repeat(rev.rating)}</div>
                                            </div>
                                            <p style={{ color: '#9CA3AF', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>"{rev.text}"</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </motion.div>
            <style dangerouslySetInnerHTML={{ __html: `.hide-scroll::-webkit-scrollbar { display: none; }` }} />
        </div>
    );
}
