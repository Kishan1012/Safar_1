"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';

const COLORS = {
    primary: '#FF385C',
    secondary: '#FF9933',
    surface: '#1E1E24',
    textMain: '#F9FAFB',
    textMuted: '#9CA3AF',
    border: '#333338'
};

export default function Navbar() {
    const pathname = usePathname();

    const links = [
        { label: 'Home', path: '/' },
        { label: 'Stories', path: '/stories' },
        { label: 'Planner', path: '/planner' },
        { label: 'About', path: '/about' },
    ];

    const [isMobile, setIsMobile] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const { openAuthModal, user } = useAuthStore();

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return (
        <motion.nav
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: [0.25, 1, 0.5, 1] }}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 1000,
                background: 'rgba(18, 18, 20, 0.65)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                borderBottom: `1px solid rgba(255, 255, 255, 0.05)`,
                boxShadow: '0 4px 32px rgba(0,0,0,0.2)'
            }}
        >
            <div className="container" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 80 }}>
                    {/* Logo */}
                    <Link href="/" style={{ textDecoration: 'none' }}>
                        <span style={{
                            color: COLORS.textMain,
                            fontWeight: 900,
                            fontSize: '1.4rem',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            background: `linear-gradient(45deg, ${COLORS.primary}, ${COLORS.secondary})`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            fontFamily: 'system-ui, -apple-system, sans-serif'
                        }}>
                            Safar
                        </span>
                    </Link>

                    {/* Desktop Links */}
                    {!isMobile && (
                        <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
                            {links.map((link) => (
                                <Link
                                    key={link.path}
                                    href={link.path}
                                    style={{
                                        textDecoration: 'none',
                                        color: pathname === link.path ? COLORS.textMain : COLORS.textMuted,
                                        fontWeight: pathname === link.path ? 700 : 500,
                                        fontSize: '0.95rem',
                                        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                                        transition: 'color 0.3s ease',
                                        padding: '8px 0',
                                        position: 'relative'
                                    }}
                                >
                                    {link.label}
                                    {pathname === link.path && (
                                        <motion.div
                                            layoutId="navbar-underline"
                                            style={{
                                                position: 'absolute',
                                                bottom: -4,
                                                left: 0,
                                                right: 0,
                                                height: 2,
                                                background: `linear-gradient(to right, ${COLORS.primary}, ${COLORS.secondary})`,
                                                borderRadius: 2
                                            }}
                                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        />
                                    )}
                                </Link>
                            ))}
                        </div>
                    )}

                    {/* Auth Buttons / Mobile Menu Toggle */}
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                        {!isMobile && (
                            user ? (
                                <Link href="/dashboard" style={{ textDecoration: 'none', color: COLORS.textMain, fontWeight: 600, fontSize: '0.95rem', fontFamily: 'Inter, system-ui, sans-serif' }}>
                                    Dashboard
                                </Link>
                            ) : (
                                <button onClick={openAuthModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.textMain, fontWeight: 600, fontSize: '0.95rem', fontFamily: 'Inter, system-ui, sans-serif' }}>
                                    Log In
                                </button>
                            )
                        )}

                        {!user && (
                            <button onClick={openAuthModal} style={{
                                textDecoration: 'none',
                                background: `linear-gradient(to right, ${COLORS.primary}, ${COLORS.secondary})`,
                                color: '#FFF',
                                fontWeight: 600,
                                padding: isMobile ? '8px 16px' : '10px 24px',
                                borderRadius: 50,
                                fontSize: isMobile ? '0.85rem' : '0.95rem',
                                fontFamily: 'Inter, system-ui, sans-serif',
                                boxShadow: `0 4px 16px rgba(255, 56, 92, 0.3)`,
                                transition: 'transform 0.2s ease, filter 0.2s ease',
                                border: 'none',
                                cursor: 'pointer'
                            }}
                                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.filter = 'brightness(1.1)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.filter = 'brightness(1)'; }}
                            >
                                Start Free
                            </button>
                        )}
                        {isMobile && (
                            <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '5px', padding: '8px' }}>
                                <div style={{ width: 24, height: 2, background: COLORS.textMain, borderRadius: 2, transition: 'all 0.3s', transform: menuOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none' }} />
                                <div style={{ width: 24, height: 2, background: COLORS.textMain, borderRadius: 2, transition: 'all 0.3s', opacity: menuOpen ? 0 : 1 }} />
                                <div style={{ width: 24, height: 2, background: COLORS.textMain, borderRadius: 2, transition: 'all 0.3s', transform: menuOpen ? 'rotate(-45deg) translate(5px, -5px)' : 'none' }} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Dropdown Menu */}
            <AnimatePresence>
                {isMobile && menuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ background: 'rgba(18, 18, 20, 0.95)', backdropFilter: 'blur(16px)', borderTop: `1px solid rgba(255, 255, 255, 0.05)`, overflow: 'hidden' }}
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', padding: '16px 24px', gap: 16 }}>
                            {links.map(link => (
                                <Link key={link.path} href={link.path} onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none', color: pathname === link.path ? COLORS.primary : COLORS.textMain, fontSize: '1.1rem', fontWeight: 600 }}>
                                    {link.label}
                                </Link>
                            ))}
                            <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', my: 8 }} />
                            {user ? (
                                <Link href="/dashboard" onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none', color: COLORS.textMuted, fontSize: '1.1rem', fontWeight: 500 }}>
                                    Dashboard
                                </Link>
                            ) : (
                                <button onClick={() => { setMenuOpen(false); openAuthModal(); }} style={{ background: 'none', border: 'none', textAlign: 'left', padding: 0, color: COLORS.textMuted, fontSize: '1.1rem', fontWeight: 500, cursor: 'pointer' }}>
                                    Log In
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.nav>
    );
}
