'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import ItineraryDashboard from '../components/ItineraryDashboard';
import CityAutocomplete from '../components/CityAutocomplete';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Spot { id: number; name: string; location: string; category: string; emoji: string; mapX: string; mapY: string; }
interface Collection { id: number; name: string; city: string; spots: number; tag: string; emoji: string; }
interface TripMeta { origin: string; destination: string; start_date: string; end_date: string; people: string; }

// ─── Data ─────────────────────────────────────────────────────────────────────
const TICKER_ITEMS = [
    'Rajasthan 🏰', 'Goa 🏖️', 'Kerala 🌴', 'Ladakh 🏔️', 'Hampi 🗿',
    'Munnar 🍃', 'Rishikesh 🕉️', 'Andaman 🌊', 'Shimla ❄️', 'Varanasi 🪔',
    'Coorg ☕', 'Manali 🎿', 'Udaipur 🏰', 'Jaisalmer 🐪', 'Kodaikanal 🌸',
];

const SAMPLE_SPOTS: Spot[] = [
    { id: 1, name: 'Mehrangarh Fort', location: 'Jodhpur, Rajasthan', category: 'Heritage', emoji: '🏰', mapX: '28%', mapY: '38%' },
    { id: 2, name: 'Stepwell Chand Baori', location: 'Abhaneri, Rajasthan', category: 'Heritage', emoji: '🪜', mapX: '44%', mapY: '52%' },
    { id: 3, name: 'Suryagarh Desert Camp', location: 'Jaisalmer, Rajasthan', category: 'Stay', emoji: '⛺', mapX: '18%', mapY: '45%' },
    { id: 4, name: 'Masala Chowk', location: 'Jaipur, Rajasthan', category: 'Street Food', emoji: '🍛', mapX: '39%', mapY: '32%' },
    { id: 5, name: 'Pushkar Lake Sunrise', location: 'Pushkar, Rajasthan', category: 'Nature', emoji: '🌅', mapX: '30%', mapY: '58%' },
];

const COLLECTIONS: Collection[] = [
    { id: 1, name: 'Rajasthan Road Trip', city: 'Rajasthan', spots: 18, tag: '🏰 Heritage', emoji: '🐪' },
    { id: 2, name: 'Kerala Backwaters', city: 'Kerala', spots: 12, tag: '🌴 Nature', emoji: '🚤' },
    { id: 3, name: 'Goa Beach Life', city: 'Goa', spots: 23, tag: '🏖️ Beaches', emoji: '🌊' },
    { id: 4, name: 'Leh-Ladakh Expedition', city: 'Ladakh', spots: 15, tag: '🏔️ Adventure', emoji: '🏕️' },
];

const DESTINATIONS = [
    { name: 'Jaisalmer', state: 'Rajasthan', label: 'Golden City', tags: '🐪 Desert · 🏰 Forts', col: 'col-span-2' },
    { name: 'Ladakh', state: 'J&K', label: 'Land of Passes', tags: '🏔️ Mountains · 🏍️ Rides' },
    { name: 'Goa', state: 'Goa', label: 'Party & Beaches', tags: '🏖️ Beaches · 🍹 Nightlife' },
    { name: 'Varanasi', state: 'UP', label: 'Spiritual Capital', tags: '🪔 Culture · 🛶 Ghats' },
];

const FEATURES_LIST = [
    { icon: '⚡', title: '1-Tap Import from Reels & Shorts', desc: 'Paste any Instagram Reel, YouTube Short, or Zomato link. Our AI extracts the location instantly — no typing needed.' },
    { icon: '🗺️', title: 'India-Specific Map & Clusters', desc: 'View all your saved dhabas, forts, beaches, and temples on one map. Smart clustering by district and state.' },
    { icon: '🤖', title: 'AI Route Optimizer', desc: 'Our algorithm groups nearby spots into optimal day plans — respecting Indian roads, monsoons, and your budget.' },
    { icon: '🇮🇳', title: 'Built for Bharat', desc: 'Categories that make sense: dhabas, ghats, ashrams, hill stations, forts. Not generic western travel buckets.' },
    { icon: '📱', title: 'WhatsApp Trip Sharing', desc: 'Share your complete itinerary as a WhatsApp link. Friends can view even without downloading the app.' },
    { icon: '💰', title: 'Budget Tracker in ₹', desc: 'Track your travel budget in INR. Integrated with OYO, Zomato, and MakeMyTrip for live price estimates.' },
];

const APIS = [
    { logo: '🗺️', name: 'Google Maps India', desc: 'Street View, local place data', badge: 'paid' },
    { logo: '🏨', name: 'OYO API', desc: 'Budget hotel availability', badge: 'paid' },
    { logo: '🍽️', name: 'Zomato API', desc: 'Restaurant data & menus', badge: 'paid' },
    { logo: '✈️', name: 'MakeMyTrip', desc: 'Flights & train connections', badge: 'paid' },
    { logo: '💳', name: 'Razorpay', desc: 'UPI, Cards, Net Banking', badge: 'paid' },
    { logo: '📲', name: 'WhatsApp Cloud', desc: 'Trip sharing & notifications', badge: 'free' },
    { logo: '🚂', name: 'IRCTC Rail API', desc: 'Train schedules & PNR', badge: 'free' },
    { logo: '🌤️', name: 'OpenWeather India', desc: 'Monsoon & weather alerts', badge: 'free' },
];

// ─── Vibe Personas (cinematic) ───────────────────────────────────────────────
const VIBES = [
    {
        id: 'romantic',
        label: 'Romantic Escape',
        emoji: '💑',
        tagline: 'Sunsets for two',
        desc: 'Candlelit dinners, heritage havelis, rooftop views. Perfect for couples & anniversaries.',
        gradient: 'linear-gradient(135deg, #E91E8C 0%, #FF6B9D 100%)',
        glow: 'rgba(233,30,140,0.25)',
        tags: ['Udaipur', 'Goa', 'Coorg'],
    },
    {
        id: 'family',
        label: 'Family Adventure',
        emoji: '👨‍👩‍👧‍👦',
        tagline: 'Memories for everyone',
        desc: 'Kid-friendly forts, wildlife safaris, hill stations. Activities the whole family loves.',
        gradient: 'linear-gradient(135deg, #FF6B1A 0%, #FFBA00 100%)',
        glow: 'rgba(255,107,26,0.25)',
        tags: ['Jaipur', 'Shimla', 'Corbett'],
    },
    {
        id: 'solo',
        label: 'Solo Explorer',
        emoji: '🎒',
        tagline: 'Your rules, your rhythm',
        desc: 'Hidden monasteries, local trains, homestays. Off the beaten track — solo and free.',
        gradient: 'linear-gradient(135deg, #13A898 0%, #00D4AA 100%)',
        glow: 'rgba(19,168,152,0.25)',
        tags: ['Spiti', 'Hampi', 'Rishikesh'],
    },
    {
        id: 'bizleisure',
        label: 'Business & Leisure',
        emoji: '💼',
        tagline: 'Work smart, explore more',
        desc: 'Premium hotels, curated half-day excursions between meetings. Maximum ROI on travel time.',
        gradient: 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)',
        glow: 'rgba(79,70,229,0.25)',
        tags: ['Bangalore', 'Mumbai', 'Hyderabad'],
    },
];

const TESTIMONIALS = [
    { avatar: '👩', name: 'Priya Sharma', city: 'Bengaluru', stars: 5, text: 'I saved 47 Instagram Reels about Rajasthan and Safar turned them into a perfect 7-day itinerary. Literally no effort!' },
    { avatar: '👨', name: 'Rahul Mehta', city: 'Mumbai', stars: 5, text: 'Finally an app that has Indian categories — dhabas, chai stops, ghats! Not just "restaurants" like western apps.' },
    { avatar: '👩', name: 'Anjali Nair', city: 'Kochi', stars: 5, text: 'The WhatsApp sharing feature is 🔥. Shared my Kerala itinerary with friends in 2 taps. Even my parents could open it!' },
    { avatar: '👨', name: 'Vikram Singh', city: 'Delhi', stars: 5, text: 'Planned a Leh-Ladakh bike trip using YouTube Shorts I\'d bookmarked for months. The route optimization saved us 3 hours of duplicate riding.' },
];

const HOW_IT_WORKS = [
    { num: '1', title: 'Save Spots from Any App', desc: 'Instagram Reels, YouTube Shorts, Zomato, Google Maps — just paste the link or screenshot it.' },
    { num: '2', title: 'AI Extracts the Location', desc: 'GPT-4 reads the content and finds the exact place — even from Hindi captions.' },
    { num: '3', title: 'Organize Collections', desc: 'Group spots by trip: "Goa Beach Trip", "Rajasthan with Parents", "Budget Himachal".' },
    { num: '4', title: 'Generate Optimized Itinerary', desc: 'Tell us days & budget. We order stops to minimize travel time — no zig-zagging across Jaipur.' },
];

// ─── Main Page ────────────────────────────────────────────────────────────────
const N8N_WEBHOOK = 'https://kishansingh1212.app.n8n.cloud/webhook-test/4b136b51-074f-4fdf-a9c9-2ca5e1ea0eb8';

export default function SafarHome() {
    const [activeSpot, setActiveSpot] = useState<number | null>(null);
    const [importUrl, setImportUrl] = useState('');

    // ── Trip Metadata State ──────────────────────────────────────────────────
    const [tripMeta, setTripMeta] = useState<TripMeta>({
        origin: '',
        destination: '',
        start_date: '',
        end_date: '',
        people: '2',
    });
    const [webhookStatus, setWebhookStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [showDashboard, setShowDashboard] = useState(false);
    const [tripSessionId, setTripSessionId] = useState<string | null>(null);
    const [cooldown, setCooldown] = useState(0);       // seconds remaining before retry
    const [rateLimitError, setRateLimitError] = useState(false);

    // ── 60-second cooldown countdown ──────────────────────────────────────────
    useEffect(() => {
        if (cooldown <= 0) return;
        const t = setTimeout(() => setCooldown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [cooldown]);

    const handleGenerate = async () => {
        if (cooldown > 0) return;
        if (!tripMeta.origin || !tripMeta.destination || !tripMeta.start_date || !tripMeta.end_date || !tripMeta.people) {
            alert('Please fill in all fields (Origin, Destination, Dates, and People)!');
            return;
        }

        const sessionId = `trip_${Date.now()}`;
        setTripSessionId(sessionId);
        setShowDashboard(true);
        setWebhookStatus('loading');
        setRateLimitError(false);

        try {
            const res = await fetch(N8N_WEBHOOK, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    trip_id: sessionId,
                    origin: tripMeta.origin,
                    destination: tripMeta.destination,
                    start_date: tripMeta.start_date,
                    end_date: tripMeta.end_date,
                    people: parseInt(tripMeta.people) || 2,
                    timestamp: new Date().toISOString(),
                    source: 'safar-web',
                }),
            });

            if (res.status === 429 || res.status === 500) {
                // Rate-limited or server overload — start cooldown
                setWebhookStatus('error');
                setRateLimitError(true);
                setCooldown(60);
            } else if (res.ok) {
                setWebhookStatus('success');
                setTimeout(() => setWebhookStatus('idle'), 4000);
            } else {
                setWebhookStatus('error');
            }
        } catch {
            setWebhookStatus('error');
        }
    };



    return (
        <>
            {/* ══ NAVBAR ══════════════════════════════════════════════════════════ */}
            <nav className="navbar">
                <div className="container">
                    <div className="nav-inner">
                        <Link href="/" className="nav-logo">
                            <div className="nav-logo-icon">🧭</div>
                            <span style={{ background: 'linear-gradient(135deg, #FF6B1A, #FFBA00)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Safar</span>
                            <span className="lang-tag">भारत</span>
                        </Link>

                        <ul className="nav-links">
                            <li><Link href="#features">Features</Link></li>
                            <li><Link href="#destinations">Destinations</Link></li>
                            <li><Link href="#planner">Planner</Link></li>
                            <li><Link href="#pricing">Pricing</Link></li>
                        </ul>

                        <div className="nav-cta">
                            <Link href="/login" className="btn btn-ghost" style={{ padding: '9px 20px' }}>Log In</Link>
                            <Link href="/signup" className="btn btn-saffron" style={{ padding: '9px 22px' }}>
                                Start Free 🇮🇳
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* ══ HERO ════════════════════════════════════════════════════════════ */}
            <section className="hero">
                <div className="hero-bg" />
                <div className="hero-overlay" />

                <div className="container">
                    <div className="hero-content">
                        <div className="hero-eyebrow">
                            <span className="hero-flag">🇮🇳</span>
                            <span className="chip">Made in India, for India</span>
                            <span className="hero-flag">✨</span>
                        </div>

                        <h1>
                            Apni Dream Trip<br />
                            <span className="grad-full">Banao in Seconds</span>
                        </h1>

                        <p className="hero-subtitle">
                            Save spots from <strong style={{ color: '#FF6B1A' }}>Instagram Reels</strong>, <strong style={{ color: '#FFBA00' }}>YouTube Shorts</strong> & Zomato —
                            and let AI build a perfectly routed itinerary across <strong style={{ color: '#13A898' }}>Incredible India</strong>.
                        </p>

                        <div className="hero-cta">
                            <Link href="/signup" className="btn btn-saffron btn-lg pulse">
                                🚀 Start Planning Free
                            </Link>
                            <Link href="#planner" className="btn btn-ghost btn-lg">
                                See the Planner →
                            </Link>
                        </div>

                        {/* Hero Stats */}
                        <div className="hero-stats">
                            {[
                                { value: '2L+', label: 'Indian Places Indexed' },
                                { value: '28+', label: 'States Covered' },
                                { value: '50K+', label: 'Safaris Created' },
                                { value: '4.9★', label: 'App Store Rating' },
                            ].map(s => (
                                <div key={s.label} style={{ textAlign: 'center' }}>
                                    <div className="hero-stat-value">{s.value}</div>
                                    <div className="hero-stat-label">{s.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ══ DESTINATION TICKER ══════════════════════════════════════════════ */}
            <div className="ticker-wrap">
                <div className="ticker-track">
                    {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
                        <span className="ticker-item" key={i}>
                            {item}
                            <span className="ticker-dot" />
                        </span>
                    ))}
                </div>
            </div>

            {/* ══ FEATURES ════════════════════════════════════════════════════════ */}
            <section className="section" id="features">
                <div className="container">
                    <div className="section-head">
                        <div className="chip">Why Safar?</div>
                        <h2 style={{ marginTop: 16 }}>
                            Built <span className="grad-saffron">Different.</span><br />
                            Built for <span className="grad-teal">Bharat.</span>
                        </h2>
                        <p>Everything a desi traveller needs — none of the fluff.</p>
                    </div>

                    <div className="features-grid">
                        {FEATURES_LIST.map(f => (
                            <div className="feature-card" key={f.title}>
                                <div className="feature-icon-wrap">{f.icon}</div>
                                <div className="feature-title">{f.title}</div>
                                <p style={{ fontSize: '0.88rem' }}>{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ DESTINATIONS ════════════════════════════════════════════════════ */}
            <section className="section" id="destinations" style={{ background: 'var(--surface)' }}>
                <div className="container">
                    <div className="section-head">
                        <div className="chip">Popular Safaris</div>
                        <h2 style={{ marginTop: 16 }}>
                            From <span className="grad-saffron">Thar Desert</span> to<br />
                            <span className="grad-teal">Kerala Backwaters</span>
                        </h2>
                        <p>Pre-built itineraries for India&apos;s most-loved destinations.</p>
                    </div>

                    <div className="destinations-grid">
                        {/* Big left card */}
                        <div className="dest-card" style={{ borderRadius: '24px', overflow: 'hidden', position: 'relative', cursor: 'pointer' }}>
                            <Image src="/destinations.png" alt="Indian Destinations" fill style={{ objectFit: 'cover', filter: 'brightness(0.6) saturate(1.2)' }} />
                            <div className="dest-info" style={{ bottom: 0, padding: '32px 28px 28px' }}>
                                <div className="dest-name" style={{ fontSize: '1.8rem' }}>Incredible India</div>
                                <div className="dest-meta">4 Iconic Destinations · 60+ Curated Spots</div>
                                <div className="dest-tag" style={{ fontSize: '0.8rem', padding: '4px 16px' }}>✨ Starter Collection</div>
                            </div>
                        </div>

                        {/* Right small cards */}
                        {DESTINATIONS.slice(1).map(dest => (
                            <div className="dest-card" key={dest.name} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', background: 'var(--surface-2)', minHeight: 200 }}>
                                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,107,26,0.08) 0%, rgba(11,123,111,0.05) 100%)' }} />
                                <div className="dest-info" style={{ position: 'relative', background: 'none', padding: '20px 20px 20px' }}>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--saffron-light)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{dest.state}</div>
                                    <div className="dest-name" style={{ fontSize: '1.2rem' }}>{dest.name}</div>
                                    <div className="dest-meta">{dest.label}</div>
                                    <div className="dest-tag" style={{ marginTop: 10 }}>{dest.tags}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ textAlign: 'center', marginTop: 40 }}>
                        <Link href="/destinations" className="btn btn-ghost">
                            Explore All 28 States →
                        </Link>
                    </div>
                </div>
            </section>

            {/* ══ IMPORT DEMO ════════════════════════════════════════════════════ */}
            <section className="section">
                <div className="container">
                    <div className="section-head">
                        <div className="chip">1-Tap Import</div>
                        <h2 style={{ marginTop: 16 }}>
                            See a Reel? <span className="grad-saffron">Save it instantly.</span>
                        </h2>
                        <p>Paste any link from your favourite platform — AI does the rest.</p>
                    </div>

                    <div className="import-box">
                        <div style={{ fontSize: '3rem', marginBottom: 8 }}>🔗</div>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: 4 }}>Drop your travel link here</h3>
                        <p style={{ fontSize: '0.85rem' }}>Instagram · YouTube · Zomato · Google Maps · TripAdvisor</p>

                        <input
                            className="import-input"
                            type="text"
                            placeholder="https://www.instagram.com/reel/..."
                            value={importUrl}
                            onChange={e => setImportUrl(e.target.value)}
                        />

                        <button className="btn btn-saffron" style={{ width: '100%', justifyContent: 'center', marginTop: 14 }}>
                            ⚡ Extract Location with AI
                        </button>

                        <div className="platform-pills">
                            {['📸 Instagram Reels', '▶️ YouTube Shorts', '🍽️ Zomato', '📍 Google Maps', '🗺️ TripAdvisor'].map(p => (
                                <span className="platform-pill" key={p}>{p}</span>
                            ))}
                        </div>

                        {/* Simulated extraction result */}
                        {importUrl.length > 15 && (
                            <div style={{ marginTop: 20, padding: '16px', background: 'var(--surface-3)', borderRadius: '12px', border: '1px solid var(--border-glow)', textAlign: 'left' }}>
                                <div style={{ fontSize: '0.72rem', color: 'var(--teal-light)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>✓ Location Extracted</div>
                                <div style={{ fontWeight: 700, color: 'var(--text)' }}>🏰 Mehrangarh Fort</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>📍 Jodhpur, Rajasthan · Heritage · ⭐ 4.8 · 🕘 Open 9am–5pm</div>
                                <button className="btn btn-teal" style={{ marginTop: 12, width: '100%', justifyContent: 'center', padding: '10px' }}>
                                    + Save to Collection
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* ══ PLANNER DEMO ═══════════════════════════════════════════════════ */}
            <section className="section" id="planner" style={{ background: 'var(--surface)', paddingTop: 64, paddingBottom: 64 }}>
                <div className="container">
                    <div className="section-head">
                        <div className="chip">Interactive Planner</div>
                        <h2 style={{ marginTop: 16 }}>
                            Your Spots. <span className="grad-saffron">One Map.</span>
                        </h2>
                        <p>Visualize your entire Rajasthan trip at a glance.</p>
                    </div>

                    <div className="planner-wrap">
                        {/* Fake Mac chrome */}
                        <div className="planner-topbar">
                            <div className="planner-dot" style={{ background: '#FF5F57' }} />
                            <div className="planner-dot" style={{ background: '#FFBD2E' }} />
                            <div className="planner-dot" style={{ background: '#28C840' }} />
                            <span style={{ marginLeft: 12, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Safar — Rajasthan Road Trip · 18 spots</span>
                        </div>

                        <div className="planner-body">
                            {/* Sidebar */}
                            <div className="planner-sidebar">
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
                                    📍 Saved Spots (5)
                                </div>
                                {SAMPLE_SPOTS.map(spot => (
                                    <div
                                        className="spot-item"
                                        key={spot.id}
                                        onClick={() => setActiveSpot(spot.id === activeSpot ? null : spot.id)}
                                        style={{ borderColor: activeSpot === spot.id ? 'var(--saffron)' : undefined, background: activeSpot === spot.id ? 'rgba(255,107,26,0.08)' : undefined }}
                                    >
                                        <div className="spot-emoji">{spot.emoji}</div>
                                        <div className="spot-info">
                                            <div className="spot-name">{spot.name}</div>
                                            <div className="spot-loc">📍 {spot.location}</div>
                                        </div>
                                        <span className="spot-cat">{spot.category}</span>
                                    </div>
                                ))}

                                <button className="btn btn-saffron" style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}>
                                    ✨ Generate 3-Day Itinerary
                                </button>

                                {/* Itinerary Preview */}
                                <div style={{ marginTop: 20, background: 'var(--surface-2)', borderRadius: '14px', padding: '16px', border: '1px solid var(--border)' }}>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--teal-light)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 10 }}>📅 Day 1 — Jaisalmer</div>
                                    {[
                                        { time: '09:00', name: 'Jaisalmer Fort', emoji: '🏰' },
                                        { time: '12:30', name: 'Natraj Restaurant', emoji: '🍛' },
                                        { time: '15:00', name: 'Gadisar Lake', emoji: '🌊' },
                                        { time: '19:00', name: 'Desert Sunset Camp', emoji: '🌅' },
                                    ].map(item => (
                                        <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-faint)', width: 36, flexShrink: 0 }}>{item.time}</span>
                                            <span style={{ fontSize: '0.85rem' }}>{item.emoji}</span>
                                            <span style={{ fontSize: '0.82rem', color: 'var(--text)' }}>{item.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Map Area */}
                            <div className="planner-map">
                                <div className="map-grid-lines" />

                                {/* Route path (SVG) */}
                                <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 1 }}>
                                    <polyline
                                        points="28%,38% 30%,58% 39%,32% 44%,52% 18%,45%"
                                        style={{ fill: 'none', stroke: 'rgba(255,107,26,0.35)', strokeWidth: 2, strokeDasharray: '8,6' }}
                                    />
                                </svg>

                                {/* Map Pins */}
                                {SAMPLE_SPOTS.map(spot => (
                                    <div
                                        className="map-pin"
                                        key={spot.id}
                                        style={{ left: spot.mapX, top: spot.mapY }}
                                        onClick={() => setActiveSpot(spot.id === activeSpot ? null : spot.id)}
                                    >
                                        <div className="pin-bubble" style={{
                                            background: activeSpot === spot.id
                                                ? 'linear-gradient(135deg, #13A898, #0B7B6F)'
                                                : 'linear-gradient(135deg, #FF6B1A, #FFBA00)',
                                        }}>
                                            {spot.emoji}
                                        </div>
                                        <div className="pin-label">{spot.name}</div>
                                    </div>
                                ))}

                                {/* State label */}
                                <div className="map-center-label" style={{ pointerEvents: 'none' }}>
                                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' }}>RAJASTHAN</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══ TRIP PERSONA PLANNER ════════════════════════════════════════ */}
            <section className="section" id="trip-planner" style={{ background: 'linear-gradient(180deg, var(--bg) 0%, #0D0A1A 100%)' }}>
                <div className="container">
                    <div className="section-head">
                        <div className="chip">🎬 Plan Your Safari</div>
                        <h2 style={{ marginTop: 16 }}>
                            Select Your <span className="grad-saffron">Vibe.</span><br />
                            <span className="grad-teal">AI Does the Rest.</span>
                        </h2>
                        <p>Tell us when, where, and what kind of trip — we'll build the perfect itinerary.</p>
                    </div>

                    {/* ── Inputs: Origin + Destination + Dates + People ───────────────────────────────────────────── */}
                    <div className="trip-inputs-row" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) 1fr 1fr 100px', gap: '16px', marginBottom: '32px' }}>
                        <div className="trip-input-group trip-input-group--city">
                            <label className="trip-input-label">🛫 From</label>
                            <CityAutocomplete
                                placeholder="e.g. New York"
                                value={tripMeta.origin}
                                onChange={origin => setTripMeta(m => ({ ...m, origin }))}
                            />
                        </div>
                        <div className="trip-input-group trip-input-group--city">
                            <label className="trip-input-label">📍 To</label>
                            <CityAutocomplete
                                value={tripMeta.destination}
                                onChange={destination => setTripMeta(m => ({ ...m, destination }))}
                            />
                        </div>
                        <div className="trip-input-group">
                            <label className="trip-input-label">🗓️ Start Date</label>
                            <input
                                className="trip-input"
                                type="date"
                                value={tripMeta.start_date}
                                min={new Date().toISOString().split('T')[0]}
                                onChange={e => setTripMeta(m => ({ ...m, start_date: e.target.value }))}
                                style={{ paddingTop: '10px' }}
                            />
                        </div>
                        <div className="trip-input-group">
                            <label className="trip-input-label">🏁 End Date</label>
                            <input
                                className="trip-input"
                                type="date"
                                value={tripMeta.end_date}
                                min={tripMeta.start_date || new Date().toISOString().split('T')[0]}
                                onChange={e => setTripMeta(m => ({ ...m, end_date: e.target.value }))}
                                style={{ paddingTop: '10px' }}
                            />
                        </div>
                        <div className="trip-input-group">
                            <label className="trip-input-label">👥 People</label>
                            <input
                                className="trip-input"
                                type="number"
                                min="1"
                                max="20"
                                value={tripMeta.people}
                                onChange={e => setTripMeta(m => ({ ...m, people: e.target.value }))}
                            />
                        </div>
                    </div>

                    {/* ── Generate CTA ───────────────────────────────────────────────── */}
                    <div className="trip-generate-row">
                        {/* Summary pill */}
                        {tripMeta.origin && tripMeta.destination && tripMeta.start_date && (
                            <div className="trip-summary-pill">
                                🛫 {tripMeta.origin} &nbsp;→&nbsp; 📍 {tripMeta.destination} &nbsp;·&nbsp;
                                🗓️ {tripMeta.start_date}{tripMeta.end_date ? ` → ${tripMeta.end_date}` : ''} &nbsp;·&nbsp;
                                👥 {tripMeta.people}
                            </div>
                        )}

                        <button
                            className={`btn btn-saffron btn-lg trip-generate-btn${webhookStatus === 'loading' || cooldown > 0 ? ' trip-btn-loading' : ' pulse'
                                }`}
                            onClick={handleGenerate}
                            disabled={webhookStatus === 'loading' || cooldown > 0}
                        >
                            {webhookStatus === 'loading' && '⏳ Generating...'}
                            {webhookStatus === 'success' && '✅ Trip Sent! Claude is building your itinerary →'}
                            {cooldown > 0 && `⏱ ${cooldown}s — Claude is resetting…`}
                            {webhookStatus === 'error' && cooldown === 0 && '❌ Error — Try again'}
                            {webhookStatus === 'idle' && cooldown === 0 && '🤖 Generate AI Itinerary'}
                        </button>

                        {webhookStatus === 'success' && (
                            <div className="trip-success-note">
                                Your trip details were sent to the AI pipeline. The itinerary will appear below shortly.
                            </div>
                        )}
                    </div>

                    {/* ── Realtime Itinerary Dashboard ────────────────────── */}
                    <ItineraryDashboard
                        tripId={tripSessionId}
                        origin={tripMeta.origin}
                        destination={tripMeta.destination}
                        visible={showDashboard}
                        rateLimitError={rateLimitError}
                    />
                </div>
            </section>


            {/* ══ HOW IT WORKS ═══════════════════════════════════════════════════ */}
            <section className="section" id="how-it-works">
                <div className="container">
                    <div className="section-head">
                        <div className="chip">How Safar Works</div>
                        <h2 style={{ marginTop: 16 }}>
                            Reel se <span className="grad-saffron">Real Trip</span> — in 4 Steps
                        </h2>
                    </div>

                    <div className="hiw-grid">
                        {HOW_IT_WORKS.map(step => (
                            <div className="hiw-step" key={step.num}>
                                <div className="hiw-num">{step.num}</div>
                                <div className="hiw-title">{step.title}</div>
                                <p style={{ fontSize: '0.85rem' }}>{step.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ INDIAN API INTEGRATIONS ═════════════════════════════════════════ */}
            <section className="section" style={{ background: 'var(--surface)' }} id="integrations">
                <div className="container">
                    <div className="section-head">
                        <div className="chip">Integrations</div>
                        <h2 style={{ marginTop: 16 }}>
                            Powered by <span className="grad-saffron">India&apos;s Best</span> Platforms
                        </h2>
                        <p>Deep integrations with the apps Indians actually use.</p>
                    </div>

                    <div className="api-grid">
                        {APIS.map(api => (
                            <div className="api-card" key={api.name}>
                                <div className="api-logo">{api.logo}</div>
                                <div className="api-name">{api.name}</div>
                                <div className="api-desc">{api.desc}</div>
                                <span className={`api-badge api-badge-${api.badge}`}>
                                    {api.badge === 'free' ? '✓ Free Tier' : '💳 Pay-per-use'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ TESTIMONIALS ═══════════════════════════════════════════════════ */}
            <section className="section">
                <div className="container">
                    <div className="section-head">
                        <div className="chip">Travellers Love Safar</div>
                        <h2 style={{ marginTop: 16 }}>
                            Real Reviews from <span className="grad-saffron">Real Desi Travellers</span>
                        </h2>
                    </div>

                    <div className="testimonials-grid">
                        {TESTIMONIALS.map(t => (
                            <div className="testimonial-card" key={t.name}>
                                <div className="testimonial-top">
                                    <div className="avatar" style={{ background: 'rgba(255,107,26,0.12)' }}>{t.avatar}</div>
                                    <div>
                                        <div className="reviewer-name">{t.name}</div>
                                        <div className="reviewer-city">📍 {t.city}</div>
                                    </div>
                                    <div className="stars" style={{ marginLeft: 'auto' }}>{'★'.repeat(t.stars)}</div>
                                </div>
                                <p className="testimonial-text">&ldquo;{t.text}&rdquo;</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ PRICING ════════════════════════════════════════════════════════ */}
            <section className="section" id="pricing" style={{ background: 'var(--surface)' }}>
                <div className="container">
                    <div className="section-head">
                        <div className="chip">Pricing — Desh ki Kimat</div>
                        <h2 style={{ marginTop: 16 }}>
                            Budget-Friendly like <span className="grad-saffron">India Itself</span>
                        </h2>
                        <p>Priced for Indian wallets. Pay with UPI, card, or net banking.</p>
                    </div>

                    <div className="pricing-grid">
                        {/* Free */}
                        <div className="pricing-card">
                            <div style={{ marginBottom: 12 }}>
                                <span style={{ fontSize: '1.5rem' }}>🆓</span>
                                <h3 style={{ marginTop: 8 }}>Free</h3>
                            </div>
                            <div style={{ marginBottom: 8 }}>
                                <span className="price-currency">₹</span>
                                <span className="price-amount">0</span>
                            </div>
                            <div className="price-period">Forever free</div>
                            <ul className="pricing-features">
                                <li>Up to 50 saved spots</li>
                                <li>3 collections</li>
                                <li>3-day itineraries</li>
                                <li>Basic map view</li>
                                <li>1 shareable WhatsApp link</li>
                                <li>Instagram & YouTube import</li>
                            </ul>
                            <Link href="/signup" className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }}>
                                Shuru Karo Free
                            </Link>
                        </div>

                        {/* Pro */}
                        <div className="pricing-card featured">
                            <div className="pricing-badge">⭐ Sabse Popular</div>
                            <div style={{ marginBottom: 12 }}>
                                <span style={{ fontSize: '1.5rem' }}>🚀</span>
                                <h3 style={{ marginTop: 8 }}>Pro</h3>
                            </div>
                            <div style={{ marginBottom: 4 }}>
                                <span className="price-currency">₹</span>
                                <span className="price-amount">299</span>
                            </div>
                            <div className="price-period">per month · or ₹2499/yr</div>
                            <ul className="pricing-features">
                                <li>Unlimited spots & collections</li>
                                <li>Unlimited itinerary days</li>
                                <li>Offline maps & downloads</li>
                                <li>AI extraction priority queue</li>
                                <li>Zomato + OYO price estimates</li>
                                <li>IRCTC train connections</li>
                                <li>Budget tracker in ₹</li>
                                <li>PDF & WhatsApp export</li>
                            </ul>
                            <Link href="/signup?plan=pro" className="btn btn-saffron" style={{ width: '100%', justifyContent: 'center' }}>
                                ₹299/mo — Start Trial →
                            </Link>
                            <div style={{ textAlign: 'center', marginTop: 10, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                💳 UPI · Cards · Net Banking via <strong style={{ color: 'var(--saffron-light)' }}>Razorpay</strong>
                            </div>
                        </div>

                        {/* Group */}
                        <div className="pricing-card">
                            <div style={{ marginBottom: 12 }}>
                                <span style={{ fontSize: '1.5rem' }}>👨‍👩‍👧‍👦</span>
                                <h3 style={{ marginTop: 8 }}>Group / Family</h3>
                            </div>
                            <div style={{ marginBottom: 4 }}>
                                <span className="price-currency">₹</span>
                                <span className="price-amount">799</span>
                            </div>
                            <div className="price-period">per month for up to 6 people</div>
                            <ul className="pricing-features">
                                <li>Everything in Pro</li>
                                <li>Shared collections & planning</li>
                                <li>Collaborative itinerary editing</li>
                                <li>Group expense splitting</li>
                                <li>Dedicated WhatsApp group bot</li>
                                <li>Priority support</li>
                            </ul>
                            <Link href="/contact" className="btn btn-teal" style={{ width: '100%', justifyContent: 'center' }}>
                                Start Group Plan →
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══ CTA ════════════════════════════════════════════════════════════ */}
            <section className="section cta-section">
                <div className="cta-glow" />
                <div className="container" style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
                    <div className="chip" style={{ marginBottom: 20 }}>Nikaalo Safar pe</div>
                    <h2>
                        India is Waiting.<br />
                        <span className="grad-full">Your Itinerary is 1 Click Away.</span>
                    </h2>
                    <p style={{ margin: '20px auto 40px', maxWidth: 460 }}>
                        Join 50,000+ Indians planning their best trips yet — from Thar Desert to Andaman islands.
                    </p>
                    <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Link href="/signup" className="btn btn-saffron btn-lg pulse">
                            🚀 Start Free — Koi Card Nahi
                        </Link>
                        <Link href="#planner" className="btn btn-ghost btn-lg">
                            Live Demo dekhein →
                        </Link>
                    </div>
                    <div style={{ marginTop: 28, display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
                        {['📱 iOS App', '🤖 Android App', '💻 Web App', '📲 WhatsApp Bot'].map(p => (
                            <span key={p} style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                {p}
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ FOOTER ═════════════════════════════════════════════════════════ */}
            <footer style={{ padding: '60px 0 0' }}>
                <div className="container">
                    <div className="footer-grid">
                        {/* Brand */}
                        <div>
                            <div className="nav-logo">
                                <div className="nav-logo-icon">🧭</div>
                                <span style={{ background: 'linear-gradient(135deg, #FF6B1A, #FFBA00)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontSize: '1.4rem', fontWeight: 800 }}>Safar</span>
                            </div>
                            <p className="footer-tagline">AI-powered travel planning built for India. From Kashmir to Kanyakumari.</p>
                            <div style={{ marginTop: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                {['📸 Instagram', '▶️ YouTube', '💬 WhatsApp'].map(s => (
                                    <Link key={s} href="#" className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: '0.8rem' }}>{s}</Link>
                                ))}
                            </div>
                        </div>

                        {/* Product */}
                        <div>
                            <div className="footer-col-title">Product</div>
                            <ul className="footer-links">
                                {['Features', 'Pricing', 'Destinations', 'Itinerary Planner', 'WhatsApp Bot', 'Mobile Apps'].map(l => (
                                    <li key={l}><Link href="#">{l}</Link></li>
                                ))}
                            </ul>
                        </div>

                        {/* Company */}
                        <div>
                            <div className="footer-col-title">Company</div>
                            <ul className="footer-links">
                                {['About Us', 'Blog', 'Careers', 'Press Kit', 'Partner with Us', 'Contact'].map(l => (
                                    <li key={l}><Link href="#">{l}</Link></li>
                                ))}
                            </ul>
                        </div>

                        {/* Legal */}
                        <div>
                            <div className="footer-col-title">Legal</div>
                            <ul className="footer-links">
                                {['Privacy Policy', 'Terms of Service', 'Refund Policy', 'Cookie Policy'].map(l => (
                                    <li key={l}><Link href="#">{l}</Link></li>
                                ))}
                            </ul>
                            <div style={{ marginTop: 20, padding: '12px 14px', background: 'var(--surface-2)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>🇮🇳 Made with ❤️ in</div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)' }}>Bharat</div>
                            </div>
                        </div>
                    </div>

                    <div className="footer-bottom">
                        <p style={{ fontSize: '0.82rem' }}>© 2026 Safar Technologies Pvt. Ltd. · CIN: U74999DLXXXX</p>
                        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>💳 Payments powered by</span>
                            <strong style={{ fontSize: '0.82rem', color: 'var(--saffron-light)' }}>Razorpay</strong>
                        </div>
                    </div>
                </div>
            </footer>
        </>
    );
}
