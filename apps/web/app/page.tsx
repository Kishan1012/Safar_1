"use client";

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { getLiveHotelDeals, HotelDeal } from '../services/travelpayouts';

const DESTINATIONS = [
    "Varanasi, Uttar Pradesh",
    "Goa",
    "Jaipur, Rajasthan",
    "Agra, Uttar Pradesh",
    "Mumbai, Maharashtra",
    "Delhi NCR",
    "Kerala",
    "Ladakh",
    "Udaipur, Rajasthan",
    "Rishikesh, Uttarakhand"
];

// Vibrant South Asian color palette
const COLORS = {
    primary: '#FF385C', // Vibrant Red/Pink
    secondary: '#FF9933', // Saffron/Orange
    accent: '#138808', // Indian Green
    blue: '#000080', // Ashoka Chakra Blue
    gold: '#FFD700', // Marigold Yellow
    surface: '#1E1E24', // Dark surface
    background: '#121214', // Deep dark background
    textMain: '#F9FAFB', // Bright white text for contrast
    textMuted: '#9CA3AF', // Soft gray for secondary text
    border: '#333338' // Subtle dark borders
};

export default function HomePage() {
    const router = useRouter();
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    // Form states
    const [originQuery, setOriginQuery] = useState("");
    const [destinationQuery, setDestinationQuery] = useState("");
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [checkInDate, setCheckInDate] = useState("");
    const [checkOutDate, setCheckOutDate] = useState("");
    const [showGuests, setShowGuests] = useState(false);
    const [adults, setAdults] = useState(0);
    const [kids, setKids] = useState(0);

    // Live Deals state
    const [deals, setDeals] = useState<HotelDeal[]>([]);

    useEffect(() => {
        getLiveHotelDeals().then(setDeals);
    }, []);

    const handleSearchSubmit = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!destinationQuery) {
            alert("Please tell us where you want to go!");
            return;
        }
        router.push(`/planner?origin=${encodeURIComponent(originQuery || "New York")}&destination=${encodeURIComponent(destinationQuery)}`);
    };

    const filteredDestinations = DESTINATIONS.filter(d =>
        d.toLowerCase().includes(destinationQuery.toLowerCase())
    );

    const totalGuests = adults + kids;

    // Close search or popovers if clicked outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsSearchOpen(false);
                setShowSuggestions(false);
                setShowGuests(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const openSearch = () => {
        if (!isSearchOpen) {
            setIsSearchOpen(true);
        }
    };

    const fadeUp = {
        hidden: { opacity: 0, y: 40 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <div style={{ paddingTop: 80, background: COLORS.background }}>

            {/* ─── Hero Search ─────────────────────────────────────────────────── */}
            <motion.section
                initial="hidden" animate="visible" variants={fadeUp} transition={{ duration: 0.8, ease: "easeOut" }}
                className="hero" style={{ minHeight: '65vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: COLORS.background, position: 'relative', overflow: 'hidden' }}>

                {/* Blended Dual Background Images */}
                <div style={{ position: 'absolute', top: 0, left: 0, width: '50.5%', height: '100%', backgroundImage: 'url(/himalayas.png)', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.5, zIndex: 0 }}></div>
                <div style={{ position: 'absolute', top: 0, right: 0, width: '50.5%', height: '100%', backgroundImage: 'url(/tea_estates.png)', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.5, zIndex: 0 }}></div>

                {/* Gradient Fades for blending and text readability */}
                <div style={{ position: 'absolute', top: 0, left: '30%', width: '40%', height: '100%', background: 'linear-gradient(to right, rgba(18,18,20,0), rgba(18,18,20,0.8), rgba(18,18,20,0))', zIndex: 1 }}></div>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(to bottom, rgba(18,18,20,0.1) 0%, rgba(18,18,20,1) 100%)', zIndex: 2 }}></div>

                {/* Decorative glows */}
                <div style={{ position: 'absolute', top: -100, left: -100, width: 300, height: 300, background: COLORS.secondary, opacity: 0.1, borderRadius: '50%', filter: 'blur(60px)', zIndex: 3 }}></div>
                <div style={{ position: 'absolute', bottom: -100, right: -100, width: 400, height: 400, background: COLORS.primary, opacity: 0.1, borderRadius: '50%', filter: 'blur(80px)', zIndex: 4 }}></div>

                <div className="container" style={{ position: 'relative', zIndex: 10 }}>
                    <div style={{ textAlign: 'center', marginBottom: 40 }}>
                        <h1 style={{ color: COLORS.textMain, fontSize: 'clamp(2.5rem, 5vw, 4.5rem)', fontWeight: 800, textShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>Explore South Asia</h1>
                        <p style={{ color: COLORS.textMuted, fontSize: '1.1rem', marginTop: 12, maxWidth: 650, margin: '12px auto 0', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>Discover serene Himalayan peaks, vibrant cultures, and emerald tropical estates.</p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }} ref={searchRef}>
                        <div
                            style={{
                                width: '100%', maxWidth: isSearchOpen ? 950 : 600, // Widened search bar
                                background: COLORS.surface, borderRadius: 50,
                                border: `1px solid ${COLORS.border}`,
                                boxShadow: isSearchOpen ? '0 10px 40px rgba(0,0,0,0.08)' : '0 4px 20px rgba(0,0,0,0.08)',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                display: 'flex', alignItems: 'center',
                                padding: isSearchOpen ? '8px 8px 8px 32px' : '16px 32px',
                                cursor: isSearchOpen ? 'default' : 'pointer', gap: 16,
                                overflow: 'visible' // allow popovers to show
                            }}
                            onClick={openSearch}
                        >
                            {!isSearchOpen ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', gap: 12 }}>
                                    <span style={{ fontSize: '1.4rem' }}>🔍</span>
                                    <span style={{ fontSize: '1.2rem', fontWeight: 600, color: COLORS.textMain }}>Where to?</span>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', width: '100%', alignItems: 'center' }}>

                                    {/* Origin Input */}
                                    <div style={{ flex: 1.2, padding: '0 16px', borderRight: `1px solid ${COLORS.border}`, position: 'relative' }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: COLORS.textMain }}>Origin</div>
                                        <input
                                            type="text"
                                            placeholder="Departure City"
                                            value={originQuery}
                                            onChange={(e) => {
                                                setOriginQuery(e.target.value);
                                                setShowGuests(false);
                                                setShowSuggestions(false);
                                            }}
                                            style={{ border: 'none', outline: 'none', width: '100%', marginTop: 2, background: 'transparent', color: COLORS.textMain, fontSize: '0.95rem' }}
                                        />
                                    </div>

                                    {/* Destination Input */}
                                    <div style={{ flex: 1.5, padding: '0 16px', borderRight: `1px solid ${COLORS.border}`, position: 'relative' }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: COLORS.textMain }}>Destination</div>
                                        <input
                                            type="text"
                                            placeholder="Search destinations"
                                            value={destinationQuery}
                                            onChange={(e) => {
                                                setDestinationQuery(e.target.value);
                                                setShowSuggestions(true);
                                                setShowGuests(false);
                                            }}
                                            onFocus={() => {
                                                setShowSuggestions(true);
                                                setShowGuests(false);
                                            }}
                                            style={{ border: 'none', outline: 'none', width: '100%', marginTop: 2, background: 'transparent', color: COLORS.textMain, fontSize: '0.95rem' }}
                                            autoFocus
                                        />

                                        {/* Suggestions Dropdown */}
                                        {showSuggestions && (
                                            <div style={{
                                                position: 'absolute', top: 'calc(100% + 16px)', left: -16, width: 350,
                                                background: COLORS.surface, borderRadius: 24, padding: '16px 0',
                                                boxShadow: '0 12px 48px rgba(0,0,0,0.12)', zIndex: 30,
                                                maxHeight: 300, overflowY: 'auto', border: `1px solid ${COLORS.border}`
                                            }}>
                                                {filteredDestinations.length > 0 ? (
                                                    filteredDestinations.map(dest => (
                                                        <div
                                                            key={dest}
                                                            style={{ padding: '12px 24px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16, transition: 'background 0.2s' }}
                                                            onMouseEnter={(e) => (e.currentTarget.style.background = COLORS.background)}
                                                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setDestinationQuery(dest);
                                                                setShowSuggestions(false);
                                                            }}
                                                        >
                                                            <div style={{ width: 44, height: 44, borderRadius: 12, background: COLORS.background, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                                                                📍
                                                            </div>
                                                            <span style={{ fontSize: '1rem', color: COLORS.textMain, fontWeight: 500 }}>{dest}</span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div style={{ padding: '16px 24px', color: COLORS.textMuted, fontSize: '0.95rem' }}>No destinations found. Try "Goa" or "Kerala".</div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Add Multi-City */}
                                    <div style={{ flex: 0.6, padding: '0 16px', borderRight: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <button style={{ background: 'transparent', border: `1px dashed ${COLORS.border}`, color: COLORS.textMain, padding: '8px 12px', borderRadius: 20, fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }} onMouseEnter={(e) => e.currentTarget.style.borderColor = COLORS.primary} onMouseLeave={(e) => e.currentTarget.style.borderColor = COLORS.border}>
                                            + Add Multi-City
                                        </button>
                                    </div>

                                    {/* Check In Input */}
                                    <div style={{ flex: 1, padding: '0 16px', borderRight: `1px solid ${COLORS.border}`, position: 'relative' }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: COLORS.textMain }}>Check In</div>
                                        <input
                                            type="date"
                                            value={checkInDate}
                                            onChange={(e) => setCheckInDate(e.target.value)}
                                            onFocus={() => { setShowSuggestions(false); setShowGuests(false); }}
                                            style={{
                                                border: 'none', outline: 'none', width: '100%', marginTop: 2,
                                                background: 'transparent', color: checkInDate ? COLORS.textMain : COLORS.textMuted, fontSize: '0.90rem',
                                                fontFamily: 'inherit'
                                            }}
                                        />
                                    </div>

                                    {/* Check Out Input */}
                                    <div style={{ flex: 1, padding: '0 16px', borderRight: `1px solid ${COLORS.border}`, position: 'relative' }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: COLORS.textMain }}>Check Out</div>
                                        <input
                                            type="date"
                                            value={checkOutDate}
                                            onChange={(e) => setCheckOutDate(e.target.value)}
                                            onFocus={() => { setShowSuggestions(false); setShowGuests(false); }}
                                            style={{
                                                border: 'none', outline: 'none', width: '100%', marginTop: 2,
                                                background: 'transparent', color: checkOutDate ? COLORS.textMain : COLORS.textMuted, fontSize: '0.90rem',
                                                fontFamily: 'inherit'
                                            }}
                                            min={checkInDate}
                                        />
                                    </div>

                                    {/* Who Input */}
                                    <div style={{ flex: 1, padding: '0 16px', position: 'relative' }}>
                                        <div
                                            style={{ cursor: 'pointer' }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowGuests(!showGuests);
                                                setShowSuggestions(false);
                                            }}
                                        >
                                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: COLORS.textMain }}>Who</div>
                                            <div style={{ marginTop: 2, color: totalGuests > 0 ? COLORS.textMain : COLORS.textMuted, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {totalGuests > 0 ? `${totalGuests} guest${totalGuests > 1 ? 's' : ''}` : 'Add guests'}
                                            </div>
                                        </div>

                                        {/* Guests Popover */}
                                        {showGuests && (
                                            <div
                                                style={{
                                                    position: 'absolute', top: 'calc(100% + 16px)', right: 0, width: 340,
                                                    background: COLORS.surface, borderRadius: 24, padding: 24,
                                                    boxShadow: '0 12px 48px rgba(0,0,0,0.12)', zIndex: 30,
                                                    border: `1px solid ${COLORS.border}`
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {/* Adults Row */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                                                    <div>
                                                        <div style={{ fontWeight: 600, color: COLORS.textMain, fontSize: '1.05rem' }}>Adults</div>
                                                        <div style={{ fontSize: '0.85rem', color: COLORS.textMuted }}>Ages 13 or above</div>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                                        <button
                                                            style={{ width: 36, height: 36, borderRadius: '50%', border: `1px solid ${COLORS.border}`, background: COLORS.surface, color: COLORS.textMuted, fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: adults > 0 ? 'pointer' : 'not-allowed', opacity: adults > 0 ? 1 : 0.4 }}
                                                            onClick={() => setAdults(Math.max(0, adults - 1))}
                                                            disabled={adults === 0}
                                                        >
                                                            -
                                                        </button>
                                                        <span style={{ fontSize: '1.05rem', color: COLORS.textMain, minWidth: 20, textAlign: 'center', fontWeight: 500 }}>{adults}</span>
                                                        <button
                                                            style={{ width: 36, height: 36, borderRadius: '50%', border: `1px solid ${COLORS.border}`, background: COLORS.surface, color: COLORS.textMuted, fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                                            onClick={() => setAdults(adults + 1)}
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Kids Row */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div>
                                                        <div style={{ fontWeight: 600, color: COLORS.textMain, fontSize: '1.05rem' }}>Kids</div>
                                                        <div style={{ fontSize: '0.85rem', color: COLORS.textMuted }}>Ages 2–12</div>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                                        <button
                                                            style={{ width: 36, height: 36, borderRadius: '50%', border: `1px solid ${COLORS.border}`, background: COLORS.surface, color: COLORS.textMuted, fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: kids > 0 ? 'pointer' : 'not-allowed', opacity: kids > 0 ? 1 : 0.4 }}
                                                            onClick={() => setKids(Math.max(0, kids - 1))}
                                                            disabled={kids === 0}
                                                        >
                                                            -
                                                        </button>
                                                        <span style={{ fontSize: '1.05rem', color: COLORS.textMain, minWidth: 20, textAlign: 'center', fontWeight: 500 }}>{kids}</span>
                                                        <button
                                                            style={{ width: 36, height: 36, borderRadius: '50%', border: `1px solid ${COLORS.border}`, background: COLORS.surface, color: COLORS.textMuted, fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                                            onClick={() => setKids(kids + 1)}
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                </div>

                                            </div>
                                        )}
                                    </div>

                                    <button
                                        className="btn btn-primary"
                                        onClick={handleSearchSubmit}
                                        style={{ background: `linear-gradient(45deg, ${COLORS.primary}, ${COLORS.secondary})`, width: 52, height: 52, borderRadius: '50%', border: 'none', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, flexShrink: 0, boxShadow: `0 4px 12px rgba(255, 56, 92, 0.3)`, transition: 'transform 0.2s' }}
                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                    >
                                        <span style={{ fontSize: '1.4rem' }}>🔍</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </motion.section>

            {/* ─── Featured Travel Packages (Bento Grid) ──────────────────────────────────────────────── */}
            <motion.section
                initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp} transition={{ duration: 0.8, ease: "easeOut" }}
                className="section" style={{ background: COLORS.background, padding: '100px 0 60px', overflow: 'hidden' }}>
                <div className="container" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 48, flexWrap: 'wrap', gap: 20 }}>
                        <div>
                            <div style={{ color: COLORS.primary, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, fontSize: '0.8rem', marginBottom: 12 }}>Exclusive Escapes</div>
                            <h2 style={{ color: COLORS.textMain, fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, margin: 0, letterSpacing: '-1px' }}>Featured Travel Packages</h2>
                        </div>
                        <button style={{ background: 'transparent', border: `1px solid rgba(255,255,255,0.15)`, color: COLORS.textMain, padding: '12px 28px', borderRadius: 50, fontWeight: 600, cursor: 'pointer', backdropFilter: 'blur(10px)', transition: 'all 0.3s' }} className="hover-glass">View All Flights & Stays</button>
                    </div>
                </div>

                {/* Horizontal Bento Grid Scroll Container */}
                <div style={{
                    paddingLeft: 'max(24px, calc((100vw - 1200px) / 2))',
                    paddingRight: 24,
                    display: 'flex', gap: 24, overflowX: 'auto', scrollSnapType: 'x mandatory',
                    paddingBottom: 40, scrollbarWidth: 'none', msOverflowStyle: 'none'
                }} className="hide-scroll">
                    {deals.map((pkg, i) => (
                        <div key={pkg.id} style={{
                            width: i % 2 === 0 ? 400 : 320,
                            height: i % 2 === 0 ? 520 : 420,
                            alignSelf: i % 2 === 0 ? 'flex-start' : 'flex-end',
                            borderRadius: 32, position: 'relative', overflow: 'hidden', scrollSnapAlign: 'start', flexShrink: 0,
                            cursor: 'pointer', transition: 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)'
                        }} className="bento-card">
                            <img src={pkg.img} alt={pkg.title} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.8s cubic-bezier(0.25, 1, 0.5, 1)' }} className="bento-img" />

                            {/* Glassmorphism Overlay */}
                            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)' }}></div>
                            <div style={{
                                position: 'absolute', bottom: 20, left: 20, right: 20,
                                background: 'rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                                border: '1px solid rgba(255,255,255,0.15)', borderRadius: 24, padding: '20px 24px',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.3s'
                            }} className="bento-glass-panel">
                                <div>
                                    <h3 style={{ margin: '0 0 6px', color: '#FFF', fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.5px' }}>{pkg.title}</h3>
                                    <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', fontWeight: 500 }}>Starting from <span style={{ color: '#5FEA87', fontWeight: 800 }}>{pkg.currency}{pkg.price}</span></div>
                                </div>
                                <a href={pkg.affiliateUrl} target="_blank" rel="noopener noreferrer" style={{
                                    background: `linear-gradient(45deg, ${COLORS.primary}, ${COLORS.secondary})`, color: '#FFF', border: 'none', width: 44, height: 44, borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                    fontWeight: 700, transition: 'all 0.3s cubic-bezier(0.25, 1, 0.5, 1)', boxShadow: `0 8px 20px rgba(255, 56, 92, 0.3)`
                                }} className="book-btn pulse-glow">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            </motion.section>

            {/* ─── Traveler Blogs (Minimalist Grid) ──────────────────────────────────────────────── */}
            <motion.section
                initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp} transition={{ duration: 0.8, ease: "easeOut" }}
                className="section" style={{ background: COLORS.background, padding: '40px 0 100px' }}>
                <div className="container" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
                    <div style={{ marginBottom: 60, borderBottom: `1px solid rgba(255,255,255,0.1)`, paddingBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 20 }}>
                        <h2 style={{ color: COLORS.textMain, fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 400, margin: 0, fontFamily: 'Georgia, serif', fontStyle: 'italic', letterSpacing: '-1px' }}>Traveler Dispatches</h2>
                        <a href="#" style={{ color: COLORS.textMuted, textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: 1, transition: 'color 0.3s' }} className="hover-text-primary">Read Journal →</a>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 32 }}>
                        {/* Large Featured Blog */}
                        <div style={{ gridColumn: '1 / -1', '@media (min-width: 900px)': { gridColumn: 'span 7' }, position: 'relative', cursor: 'pointer' } as React.CSSProperties} className="blog-card group">
                            <div style={{ overflow: 'hidden', borderRadius: 24, height: 'clamp(300px, 50vh, 500px)', marginBottom: 24 }}>
                                <img src="https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=1200" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.8s ease' }} className="blog-img" />
                            </div>
                            <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 12 }}>
                                <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 1.5, color: COLORS.primary, fontWeight: 700 }}>Culture</span>
                                <span style={{ fontSize: '0.85rem', color: COLORS.textMuted }}>Oct 12, 2026</span>
                            </div>
                            <h3 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', fontWeight: 400, fontFamily: 'Georgia, serif', color: COLORS.textMain, margin: '0 0 16px', lineHeight: 1.15, letterSpacing: '-0.5px' }} className="blog-title">Lost in the Medina: A Photographer’s Guide to Marrakech</h3>
                            <p style={{ color: COLORS.textMuted, fontSize: '1.1rem', lineHeight: 1.6, margin: 0, maxWidth: '90%' }}>Navigating the labyrinthine streets, vibrant souks, and hidden riads of Morocco's most mesmerizing city.</p>
                        </div>

                        {/* Two Smaller Blogs */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 40, '@media (min-width: 900px)': { gridColumn: 'span 5' } } as React.CSSProperties}>
                            <div style={{ cursor: 'pointer' }} className="blog-card group">
                                <div style={{ overflow: 'hidden', borderRadius: 20, height: 220, marginBottom: 20 }}>
                                    <img src="https://images.unsplash.com/photo-1502481851512-e9e2529bfbf9?q=80&w=800" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.8s ease' }} className="blog-img" />
                                </div>
                                <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 10 }}>
                                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 1.5, color: COLORS.secondary, fontWeight: 700 }}>Adventure</span>
                                    <span style={{ fontSize: '0.8rem', color: COLORS.textMuted }}>Sep 28, 2026</span>
                                </div>
                                <h4 style={{ fontSize: '1.4rem', fontWeight: 500, color: COLORS.textMain, margin: 0, lineHeight: 1.3, letterSpacing: '-0.5px' }} className="blog-title">Hiking the Routeburn Track in 3 Days</h4>
                            </div>

                            <div style={{ cursor: 'pointer' }} className="blog-card group">
                                <div style={{ overflow: 'hidden', borderRadius: 20, height: 220, marginBottom: 20 }}>
                                    <img src="https://images.unsplash.com/photo-1548013146-72479768bada?q=80&w=800" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.8s ease' }} className="blog-img" />
                                </div>
                                <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 10 }}>
                                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 1.5, color: COLORS.accent, fontWeight: 700 }}>Food</span>
                                    <span style={{ fontSize: '0.8rem', color: COLORS.textMuted }}>Sep 15, 2026</span>
                                </div>
                                <h4 style={{ fontSize: '1.4rem', fontWeight: 500, color: COLORS.textMain, margin: 0, lineHeight: 1.3, letterSpacing: '-0.5px' }} className="blog-title">Uncovering the Best Street Food in Osaka</h4>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.section>

            {/* ─── Curated Seasonal Itineraries ──────────────────────────────────────────────── */}
            <motion.section
                initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp} transition={{ duration: 0.8, ease: "easeOut" }}
                className="section" style={{ background: COLORS.surface, padding: '80px 0' }}>
                <div className="container">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 }}>
                        <div>
                            <div style={{ color: COLORS.primary, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, fontSize: '0.85rem', marginBottom: 8 }}>Editor's Picks</div>
                            <h2 style={{ color: COLORS.textMain, fontSize: '2.5rem', fontWeight: 800, margin: 0 }}>Curated Seasonal Itineraries</h2>
                            <p style={{ color: COLORS.textMuted, marginTop: 12, fontSize: '1.1rem' }}>Pre-made, hand-crafted trips designed for the current travel season across South Asia.</p>
                        </div>
                        <button style={{ background: 'transparent', border: `1px solid ${COLORS.border}`, color: COLORS.textMain, padding: '10px 20px', borderRadius: 50, fontWeight: 700, cursor: 'pointer' }}>View All Trends →</button>
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: 24
                    }}>
                        {[
                            {
                                id: 1,
                                title: "Himalayan Summer",
                                desc: "Escape the heat with a 7-day trek through Nepal's serene mountain monasteries.",
                                days: "7 Days",
                                tag: "Trending",
                                tagColor: COLORS.primary,
                                image: "https://images.unsplash.com/photo-1506461883276-594540eb36cb?auto=format&fit=crop&w=600&q=80"
                            },
                            {
                                id: 2,
                                title: "Rajasthan Winter Heritage",
                                desc: "A luxurious golden-triangle tour exploring majestic medieval forts and palaces.",
                                days: "5 Days",
                                tag: "Classic",
                                tagColor: COLORS.gold,
                                image: "https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=600&q=80"
                            },
                            {
                                id: 3,
                                title: "Kerala Monsoon Retreat",
                                desc: "Slow travel through lush emerald backwaters in a traditional wooden houseboat.",
                                days: "4 Days",
                                tag: "Relaxation",
                                tagColor: COLORS.accent,
                                image: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=600&q=80"
                            },
                            {
                                id: 4,
                                title: "Sri Lankan Tropics",
                                desc: "Ride the iconic vintage train through misty tea estates and tropical coastline.",
                                days: "10 Days",
                                tag: "Eco-Tour",
                                tagColor: COLORS.secondary,
                                image: "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?auto=format&fit=crop&w=600&q=80"
                            }
                        ].map((trend) => (
                            <div key={trend.id} style={{ borderRadius: 24, cursor: 'pointer', position: 'relative', border: `1px solid ${COLORS.border}`, background: COLORS.background, boxShadow: '0 8px 30px rgba(0,0,0,0.3)', transition: 'transform 0.3s, box-shadow 0.3s', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} className="zoom-hover" onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-8px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.4)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.3)'; }}>
                                <div style={{ height: 240, position: 'relative' }}>
                                    <img src={trend.image} alt={trend.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

                                    {/* Top Tags */}
                                    <div style={{ position: 'absolute', top: 16, left: 16, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', borderRadius: 50, padding: '6px 14px', fontSize: '0.8rem', fontWeight: 800, color: '#FFF', display: 'flex', gap: 6, alignItems: 'center', border: `1px solid ${COLORS.border}` }}>
                                        {trend.days}
                                    </div>
                                    <div style={{ position: 'absolute', top: 16, right: 16, background: trend.tagColor, borderRadius: 50, padding: '6px 14px', fontSize: '0.75rem', fontWeight: 800, color: '#FFF', textTransform: 'uppercase', letterSpacing: 1 }}>
                                        {trend.tag}
                                    </div>

                                    {/* Bottom gradient fade into card body */}
                                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, background: `linear-gradient(to top, ${COLORS.background}, transparent)` }}></div>
                                </div>

                                <div style={{ padding: '0 24px 24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <h3 style={{ color: COLORS.textMain, margin: '0 0 8px 0', fontSize: '1.4rem', fontWeight: 800, lineHeight: 1.2 }}>{trend.title}</h3>
                                    <p style={{ margin: 0, color: COLORS.textMuted, fontSize: '0.95rem', lineHeight: 1.5 }}>{trend.desc}</p>

                                    <div style={{ marginTop: 'auto', paddingTop: 20 }}>
                                        <div style={{ display: 'inline-block', padding: '8px 16px', borderRadius: 12, background: COLORS.surface, border: `1px solid ${COLORS.border}`, color: COLORS.textMain, fontWeight: 700, fontSize: '0.9rem' }}>
                                            View Itinerary
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.section>

            {/* ─── Traveler Stories & Reviews ────────────────────────────────────────────── */}
            <motion.section
                initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp} transition={{ duration: 0.8, ease: "easeOut" }}
                className="section" style={{ background: COLORS.background, padding: '100px 0', borderTop: `1px solid ${COLORS.border}` }}>
                <div className="container">
                    <div style={{ textAlign: 'center', marginBottom: 48 }}>
                        <div style={{ color: COLORS.primary, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, fontSize: '0.85rem', marginBottom: 8 }}>Testimonials</div>
                        <h2 style={{ color: COLORS.textMain, fontSize: '2.5rem', fontWeight: 800, margin: 0 }}>Stories from the Road</h2>
                        <p style={{ color: COLORS.textMuted, marginTop: 12, fontSize: '1.1rem', maxWidth: 600, margin: '12px auto 0' }}>Join thousands of travelers exploring the hidden gems and diverse cultures of South Asia.</p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 32 }}>
                        {[
                            {
                                id: 1,
                                name: "Anjali M.",
                                avatar: "https://i.pravatar.cc/150?img=32",
                                location: "New Delhi, India",
                                trip: "Himalayan Retreat",
                                text: "\"The AI generated an itinerary that took me off the beaten path in Nepal. We found local tea houses I would have never discovered on my own. Truly magical.\"",
                                rating: 5
                            },
                            {
                                id: 2,
                                name: "Arjun S.",
                                avatar: "https://i.pravatar.cc/150?img=11",
                                location: "Mumbai, India",
                                trip: "Sri Lankan Horizons",
                                text: "\"Everything from the vintage train ticket booking suggestions to the hidden beaches in Mirissa was perfectly curated. Saved me hours of planning!\"",
                                rating: 4
                            },
                            {
                                id: 3,
                                name: "Priya K.",
                                avatar: "https://i.pravatar.cc/150?img=5",
                                location: "London, UK",
                                trip: "Rajasthan Royal Tour",
                                text: "\"I was worried about navigating Jaipur as a solo female traveler. Safar gave me safe transit routes and incredible boutique heritage stays. Highly recommended.\"",
                                rating: 5
                            }
                        ].map((review) => (
                            <div key={review.id} style={{
                                background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 24, padding: 32,
                                boxShadow: '0 8px 24px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column'
                            }}>
                                <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
                                    {[...Array(5)].map((_, i) => (
                                        <span key={i} style={{ color: i < review.rating ? COLORS.gold : COLORS.border, fontSize: '1.2rem' }}>★</span>
                                    ))}
                                </div>
                                <p style={{ color: COLORS.textMain, fontSize: '1.05rem', lineHeight: 1.6, flex: 1, margin: '0 0 24px 0', fontStyle: 'italic' }}>
                                    {review.text}
                                </p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16, borderTop: `1px solid ${COLORS.border}`, paddingTop: 20 }}>
                                    <img src={review.avatar} alt={review.name} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }} />
                                    <div>
                                        <div style={{ fontWeight: 800, color: COLORS.textMain, fontSize: '1rem' }}>{review.name}</div>
                                        <div style={{ color: COLORS.textMuted, fontSize: '0.85rem' }}>{review.location} • <span style={{ color: COLORS.primary }}>{review.trip}</span></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.section>

            {/* ─── Footer ──────────────────────────────────────────────────────── */}
            <motion.footer
                initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp} transition={{ duration: 0.8, ease: "easeOut" }}
                style={{ background: '#09090A', padding: '80px 0 40px', borderTop: `1px solid ${COLORS.border}` }}>
                <div className="container">
                    <div className="footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="navbar-logo" style={{ color: COLORS.textMain, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.5px', background: `linear-gradient(45deg, ${COLORS.primary}, ${COLORS.secondary})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Safar</span>
                        <p style={{ fontSize: '0.9rem', color: COLORS.textMuted, margin: 0 }}>© 2026 Safar Travel. Crafted with ❤️ for India.</p>
                        <div style={{ display: 'flex', gap: 32, fontSize: '0.9rem', fontWeight: 500 }}>
                            <Link href="/privacy" style={{ color: COLORS.textMuted, textDecoration: 'none' }}>Privacy Policy</Link>
                            <Link href="/terms" style={{ color: COLORS.textMuted, textDecoration: 'none' }}>Terms of Service</Link>
                        </div>
                    </div>
                </div>
            </motion.footer>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.6; }
                    100% { opacity: 1; }
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                
                /* Custom utility classes */
                .hide-scroll::-webkit-scrollbar { display: none; }
                
                /* Hover Effects for Bento Grid */
                .hover-glass:hover { background: rgba(255,255,255,0.1) !important; color: #FFF !important; transform: translateY(-2px); }
                .pulse-btn-vibrant:hover { transform: scale(1.05); filter: brightness(1.1); box-shadow: 0 0 25px rgba(0,230,118,0.8) !important; }
                .bento-card:hover .bento-img { transform: scale(1.05) !important; filter: brightness(1.1); }
                .bento-card:hover .bento-glass-panel { border-color: rgba(255, 56, 92, 0.4) !important; }
                .bento-card:hover .book-btn { transform: translateX(4px) scale(1.05) !important; background: #FF385C !important; color: #FFF !important; box-shadow: 0 8px 24px rgba(255, 56, 92, 0.4) !important; }
                
                /* Hover Effects for Blog Cards */
                .blog-card:hover .blog-img { transform: scale(1.03) !important; }
                .blog-card:hover .blog-title { color: #FF385C !important; }
                .hover-text-primary:hover { color: #FF385C !important; }
            `}} />
        </div>
    );
}
