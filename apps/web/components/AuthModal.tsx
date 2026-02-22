"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../utils/supabase';

export default function AuthModal() {
    const { isAuthModalOpen, closeAuthModal, setUser } = useAuthStore();

    const handleOAuth = async (provider: 'google' | 'twitter') => {
        // Handle mock integration or real
        if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
            await supabase.auth.signInWithOAuth({ provider });
        } else {
            // Mock auth for visual demo
            setTimeout(() => {
                setUser({ id: '123', email: 'traveler@safar.com', user_metadata: { full_name: 'Explorer' } } as any);
                closeAuthModal();
            }, 800);
        }
    };

    return (
        <AnimatePresence>
            {isAuthModalOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeAuthModal}
                        style={{ position: 'absolute', inset: 0, background: 'rgba(10,10,12,0.8)', backdropFilter: 'blur(16px)' }}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        style={{
                            position: 'relative',
                            width: '100%',
                            maxWidth: 420,
                            background: 'rgba(30,30,36,0.85)',
                            backdropFilter: 'blur(32px)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 32,
                            padding: 40,
                            boxShadow: '0 32px 64px rgba(0,0,0,0.5)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 24
                        }}
                    >
                        <button onClick={closeAuthModal} style={{ position: 'absolute', top: 24, right: 24, background: 'rgba(255,255,255,0.1)', border: 'none', width: 36, height: 36, borderRadius: 18, color: '#FFF', fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            ×
                        </button>

                        <div style={{ textAlign: 'center', marginBottom: 16 }}>
                            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#FFF', margin: '0 0 8px' }}>Log In to Safar</h2>
                            <p style={{ color: 'rgba(255,255,255,0.7)', margin: 0, fontSize: '0.95rem' }}>Save your trips, get exclusive deals, and start exploring.</p>
                        </div>

                        <button
                            onClick={() => handleOAuth('google')}
                            className="pulse-btn-vibrant"
                            style={{
                                padding: '16px 24px',
                                background: 'linear-gradient(135deg, #FF3D00 0%, #FF00E5 100%)',
                                color: '#FFF',
                                borderRadius: 100,
                                fontSize: '1.05rem',
                                fontWeight: 800,
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 12,
                                transition: 'all 0.2s'
                            }}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#fff" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FFF" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff" />
                            </svg>
                            Continue with Google
                        </button>

                        <button
                            onClick={() => handleOAuth('twitter')}
                            style={{
                                padding: '16px 24px',
                                background: 'rgba(255,255,255,0.1)',
                                color: '#FFF',
                                borderRadius: 100,
                                fontSize: '1.05rem',
                                fontWeight: 700,
                                border: '1px solid rgba(255,255,255,0.1)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 12,
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="#FFF" />
                            </svg>
                            Continue with X
                        </button>

                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
