"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../utils/supabase';

// Always call same-origin Next.js API routes — no CORS, works on localhost AND Vercel
const API = '/api/auth';

type Tab = 'login' | 'signup';

export default function AuthModal() {
    const { isAuthModalOpen, closeAuthModal, setUser } = useAuthStore();

    const [tab, setTab] = useState<Tab>('login');
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const resetForm = () => { setEmail(''); setPassword(''); setName(''); setError(''); setSuccess(''); };

    const switchTab = (t: Tab) => { setTab(t); resetForm(); };

    // ─── Email / Password submit ──────────────────────────────────────────────
    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            const hasSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL &&
                !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('mock');

            if (hasSupabase) {
                // ── Supabase path (works on Vercel immediately, no backend needed) ──
                if (tab === 'login') {
                    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                    if (error) {
                        setError(error.message === 'Invalid login credentials'
                            ? 'Invalid email or password'
                            : error.message);
                        return;
                    }
                    setUser(data.user as any);
                } else {
                    const { data, error } = await supabase.auth.signUp({
                        email, password,
                        options: { data: { full_name: name } }
                    });
                    if (error) { setError(error.message); return; }
                    if (data.user && !data.session) {
                        setSuccess('📧 Check your email to confirm your account!');
                        setLoading(false);
                        return;
                    }
                    setUser(data.user as any);
                }
            } else {
                // ── Auth-service proxy path (for local dev or when backend is deployed) ──
                const endpoint = tab === 'login' ? '/login' : '/signup';
                const body = tab === 'login' ? { email, password } : { email, name, password };

                const res = await fetch(`/api/auth${endpoint}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(body),
                });

                const data = await res.json();

                if (!res.ok) {
                    if (res.status === 423) {
                        setError('Account locked — too many failed attempts. Try again later.');
                    } else if (res.status === 503) {
                        setError('Auth service is not deployed yet. Please configure Supabase or deploy the backend.');
                    } else {
                        setError(data.error ?? 'Something went wrong. Please try again.');
                    }
                    return;
                }

                if (data.data?.token) localStorage.setItem('safar_token', data.data.token);
                setUser(data.data?.user as any);
            }

            setSuccess(tab === 'signup' ? '🎉 Account created! Welcome to Safar.' : '👋 Welcome back!');
            setTimeout(() => { closeAuthModal(); resetForm(); }, 1200);

        } catch {
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // ─── OAuth ────────────────────────────────────────────────────────────────
    const handleOAuth = async (provider: 'google' | 'twitter') => {
        if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
            await supabase.auth.signInWithOAuth({ provider });
        } else {
            setLoading(true);
            setTimeout(() => {
                setUser({ id: '123', email: 'traveler@safar.com', user_metadata: { full_name: 'Explorer' } } as any);
                closeAuthModal();
                setLoading(false);
            }, 800);
        }
    };

    // ─── Styles ───────────────────────────────────────────────────────────────
    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '14px 16px',
        background: 'rgba(255,255,255,0.07)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 14,
        color: '#FFF',
        fontSize: '0.95rem',
        outline: 'none',
        boxSizing: 'border-box',
        transition: 'border-color 0.2s',
    };

    const primaryBtnStyle: React.CSSProperties = {
        width: '100%',
        padding: '15px 24px',
        background: loading ? 'rgba(255,56,92,0.5)' : 'linear-gradient(135deg, #FF385C 0%, #FF9933 100%)',
        color: '#FFF',
        borderRadius: 100,
        fontSize: '1rem',
        fontWeight: 800,
        border: 'none',
        cursor: loading ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s',
        letterSpacing: '0.3px',
    };

    return (
        <AnimatePresence>
            {isAuthModalOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={closeAuthModal}
                        style={{ position: 'absolute', inset: 0, background: 'rgba(10,10,12,0.85)', backdropFilter: 'blur(16px)' }}
                    />

                    {/* Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        style={{
                            position: 'relative', width: '100%', maxWidth: 440,
                            background: 'rgba(22,22,28,0.95)',
                            backdropFilter: 'blur(32px)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 32, padding: '40px 36px',
                            boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
                            display: 'flex', flexDirection: 'column', gap: 0,
                        }}
                    >
                        {/* Close */}
                        <button
                            onClick={closeAuthModal}
                            style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.1)', border: 'none', width: 36, height: 36, borderRadius: 18, color: '#FFF', fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >×</button>

                        {/* Header */}
                        <div style={{ textAlign: 'center', marginBottom: 28 }}>
                            <div style={{ fontSize: '2rem', marginBottom: 6 }}>✈️</div>
                            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#FFF', margin: '0 0 6px' }}>
                                {tab === 'login' ? 'Welcome back' : 'Join Safar'}
                            </h2>
                            <p style={{ color: 'rgba(255,255,255,0.55)', margin: 0, fontSize: '0.9rem' }}>
                                {tab === 'login' ? 'Log in to continue your journey.' : 'Create your free account today.'}
                            </p>
                        </div>

                        {/* Tabs */}
                        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.07)', borderRadius: 14, padding: 4, marginBottom: 24, gap: 4 }}>
                            {(['login', 'signup'] as Tab[]).map(t => (
                                <button
                                    key={t}
                                    onClick={() => switchTab(t)}
                                    style={{
                                        flex: 1, padding: '10px 0', fontSize: '0.9rem', fontWeight: 700,
                                        borderRadius: 11, border: 'none', cursor: 'pointer',
                                        background: tab === t ? 'rgba(255,255,255,0.15)' : 'transparent',
                                        color: tab === t ? '#FFF' : 'rgba(255,255,255,0.45)',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    {t === 'login' ? 'Log In' : 'Sign Up'}
                                </button>
                            ))}
                        </div>

                        {/* Email/Password Form */}
                        <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                            {tab === 'signup' && (
                                <input
                                    type="text"
                                    placeholder="Full name"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    required
                                    style={inputStyle}
                                    onFocus={e => e.currentTarget.style.borderColor = 'rgba(255,56,92,0.6)'}
                                    onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'}
                                />
                            )}
                            <input
                                type="email"
                                placeholder="Email address"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                style={inputStyle}
                                onFocus={e => e.currentTarget.style.borderColor = 'rgba(255,56,92,0.6)'}
                                onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'}
                            />
                            <input
                                type="password"
                                placeholder={tab === 'signup' ? 'Password (min. 8 characters)' : 'Password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                minLength={tab === 'signup' ? 8 : 1}
                                style={inputStyle}
                                onFocus={e => e.currentTarget.style.borderColor = 'rgba(255,56,92,0.6)'}
                                onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'}
                            />

                            {/* Error / Success */}
                            {error && (
                                <div style={{ background: 'rgba(255,56,92,0.15)', border: '1px solid rgba(255,56,92,0.3)', borderRadius: 10, padding: '10px 14px', color: '#FF6B6B', fontSize: '0.85rem' }}>
                                    ⚠️ {error}
                                </div>
                            )}
                            {success && (
                                <div style={{ background: 'rgba(0,230,118,0.15)', border: '1px solid rgba(0,230,118,0.3)', borderRadius: 10, padding: '10px 14px', color: '#00E676', fontSize: '0.85rem' }}>
                                    {success}
                                </div>
                            )}

                            <button type="submit" style={primaryBtnStyle} disabled={loading}>
                                {loading ? '...' : tab === 'login' ? 'Log In' : 'Create Account'}
                            </button>
                        </form>

                        {/* Divider */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
                            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem' }}>or continue with</span>
                            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
                        </div>

                        {/* OAuth Buttons */}
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button
                                onClick={() => handleOAuth('google')}
                                style={{ flex: 1, padding: '13px 0', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, color: '#FFF', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.14)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                Google
                            </button>
                            <button
                                onClick={() => handleOAuth('twitter')}
                                style={{ flex: 1, padding: '13px 0', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, color: '#FFF', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.14)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="#FFF" />
                                </svg>
                                X / Twitter
                            </button>
                        </div>

                        {/* Footer switch */}
                        <p style={{ textAlign: 'center', marginTop: 20, color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginBottom: 0 }}>
                            {tab === 'login' ? "Don't have an account? " : 'Already have an account? '}
                            <button
                                onClick={() => switchTab(tab === 'login' ? 'signup' : 'login')}
                                style={{ background: 'none', border: 'none', color: '#FF385C', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', padding: 0 }}
                            >
                                {tab === 'login' ? 'Sign up free →' : 'Log in →'}
                            </button>
                        </p>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
