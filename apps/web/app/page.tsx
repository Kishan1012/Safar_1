"use client";

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import ItineraryResults from '../components/ItineraryResults';

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
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    // Form states
    const [whereQuery, setWhereQuery] = useState("");
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [checkInDate, setCheckInDate] = useState("");
    const [checkOutDate, setCheckOutDate] = useState("");
    const [showGuests, setShowGuests] = useState(false);
    const [adults, setAdults] = useState(0);
    const [kids, setKids] = useState(0);

    // Traveler DNA States
    const [showResults, setShowResults] = useState(false);
    const [isGeneratingItinerary, setIsGeneratingItinerary] = useState(false);
    const [itineraryResult, setItineraryResult] = useState<any>(null);
    const [loadingMessage, setLoadingMessage] = useState("Analyzing your traveler DNA...");
    const [showTravelerDNA, setShowTravelerDNA] = useState(false);
    const [dnaStep, setDnaStep] = useState(1);
    const [travelerProfile, setTravelerProfile] = useState({
        vibe: "",
        budget: "",
        pace: "",
        interests: [] as string[],
        mustSees: ""
    });

    const handleInterestToggle = (interest: string) => {
        setTravelerProfile(prev => {
            const isSelected = prev.interests.includes(interest);
            if (isSelected) {
                return { ...prev, interests: prev.interests.filter(i => i !== interest) };
            } else if (prev.interests.length < 3) {
                return { ...prev, interests: [...prev.interests, interest] };
            }
            return prev;
        });
    };

    const handleSearchSubmit = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!whereQuery) {
            alert("Please tell us where you want to go!");
            return;
        }
        setShowTravelerDNA(true);
        setDnaStep(1);
    };

    const filteredDestinations = DESTINATIONS.filter(d =>
        d.toLowerCase().includes(whereQuery.toLowerCase())
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

    const handleGenerateItinerary = async () => {
        setIsGeneratingItinerary(true);
        setLoadingMessage("Crafting your Safari...");

        const payload = {
            origin: "New York", // Placeholder as origin is not collected in UI
            destination: whereQuery.split(',')[0] || whereQuery,
            vibe: travelerProfile.vibe,
            budget: travelerProfile.budget,
            pace: travelerProfile.pace,
            must_sees: travelerProfile.mustSees,
            trip_id: "trip_" + Math.random().toString(36).substring(2, 9)
        };

        console.log("Sending to n8n:", payload);

        try {
            const res = await fetch("https://kishansingh1212.app.n8n.cloud/webhook-test/43353bb1-e944-4cb8-9288-808076c4dbcc", {
                method: "POST",
                mode: 'cors',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            console.log("Response Status:", res.status);

            if (res.ok) {
                try {
                    // LLMs sometimes return unterminated JSON strings if the context window limit is reached or the stream drops.
                    // First try native JSON parse
                    const textData = await res.text();

                    try {
                        const data = JSON.parse(textData);
                        console.log("n8n response data:", data);
                        setItineraryResult(data);
                    } catch (parseError) {
                        console.warn("Native JSON parse failed, attempting regex extraction for unterminated strings:", parseError);

                        // Extract everything between the first '{' and the last '}' we can find
                        const firstBrace = textData.indexOf('{');
                        const lastBrace = textData.lastIndexOf('}');

                        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                            const extracted = textData.substring(firstBrace, lastBrace + 1);

                            try {
                                const data = JSON.parse(extracted);
                                console.log("n8n extracted data:", data);
                                setItineraryResult(data);
                            } catch (fallbackError) {
                                // If it STILL fails, it's severely malformed. Just pass exactly what we got to the normalizer.
                                console.log("Regex fallback also failed, passing raw string to normalizer.");
                                setItineraryResult({ output: textData });
                            }
                        } else {
                            setItineraryResult({ output: textData });
                        }
                    }

                } catch (e) {
                    console.warn("Network error reading n8n response:", e);
                }

                // Successfully received 200 OK from n8n
                setShowTravelerDNA(false);
                setShowResults(true);
            } else {
                throw new Error(`n8n responded with status: ${res.status}`);
            }
        } catch (error) {
            console.error("Fetch error:", error);
            // Show toast notification
            alert("Connection to Safari Brain failed. Check your local server/n8n.");
        } finally {
            setIsGeneratingItinerary(false);
        }
    };

    const openSearch = () => {
        if (!isSearchOpen) {
            setIsSearchOpen(true);
        }
    };

    if (showResults) {
        return <ItineraryResults onBack={() => setShowResults(false)} itineraryData={itineraryResult} />;
    }

    return (
        <>
            {/* ─── Navbar ──────────────────────────────────────────────────────── */}
            <nav className="navbar" style={{ background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}` }}>
                <div className="container">
                    <div className="navbar-inner">
                        <span className="navbar-logo" style={{ color: COLORS.textMain, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.5px', background: `linear-gradient(45deg, ${COLORS.primary}, ${COLORS.secondary})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            Safar
                        </span>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <Link href="/login" className="btn btn-outline" style={{ padding: '10px 20px', borderColor: COLORS.border, color: COLORS.textMain, fontWeight: 600 }}>Log In</Link>
                            <Link href="/signup" className="btn btn-primary" style={{ padding: '10px 20px', background: `linear-gradient(to right, ${COLORS.primary}, ${COLORS.secondary})`, color: '#FFF', fontWeight: 600, border: 'none' }}>Start Free</Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* ─── Hero Search ─────────────────────────────────────────────────── */}
            <section className="hero" style={{ minHeight: '65vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: COLORS.background, position: 'relative', overflow: 'hidden' }}>

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

                                    {/* Where Input - Flex expanded */}
                                    <div style={{ flex: 1.8, padding: '0 16px', borderRight: `1px solid ${COLORS.border}`, position: 'relative' }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: COLORS.textMain }}>Where</div>
                                        <input
                                            type="text"
                                            placeholder="Search destinations (e.g. Mumbai)"
                                            value={whereQuery}
                                            onChange={(e) => {
                                                setWhereQuery(e.target.value);
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
                                                                setWhereQuery(dest);
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
            </section>

            {/* ─── Curated Seasonal Itineraries ──────────────────────────────────────────────── */}
            <section className="section" style={{ background: COLORS.surface, padding: '80px 0' }}>
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
            </section>

            {/* ─── Traveler Stories & Reviews ────────────────────────────────────────────── */}
            <section className="section" style={{ background: COLORS.background, padding: '80px 0' }}>
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
            </section>

            {/* ─── Footer ──────────────────────────────────────────────────────── */}
            <footer style={{ borderTop: `1px solid ${COLORS.border}`, padding: '60px 0 40px', background: COLORS.background }}>
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
            </footer>

            {/* ─── Traveler DNA Modal ──────────────────────────────────────────── */}
            {showTravelerDNA && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: COLORS.surface, zIndex: 9999,
                    display: 'flex', flexDirection: 'column',
                    animation: 'fadeIn 0.3s ease-out'
                }}>
                    {/* Header & Progress */}
                    <div style={{ padding: '24px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${COLORS.border}` }}>
                        <div style={{ width: 40 }}>
                            {dnaStep > 1 && (
                                <button onClick={() => setDnaStep(dnaStep - 1)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: COLORS.textMain }}>←</button>
                            )}
                        </div>
                        <div style={{ flex: 1, margin: '0 40px' }}>
                            <div style={{ height: 4, background: COLORS.border, borderRadius: 2, overflow: 'hidden' }}>
                                <div style={{ height: '100%', background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.secondary})`, width: `${(dnaStep / 5) * 100}%`, transition: 'width 0.3s ease-out' }}></div>
                            </div>
                        </div>
                        <div style={{ width: 40, textAlign: 'right' }}>
                            <button onClick={() => setShowTravelerDNA(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: COLORS.textMain }}>✕</button>
                        </div>
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px' }}>
                        <div style={{ width: '100%', maxWidth: 700 }}>
                            {dnaStep === 1 && (
                                <div style={{ textAlign: 'center', animation: 'slideUp 0.4s ease-out' }}>
                                    <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: COLORS.textMain, marginBottom: 12 }}>What is the energy of this trip?</h2>
                                    <p style={{ fontSize: '1.1rem', color: COLORS.textMuted, marginBottom: 40 }}>Select the vibe that best describes your ideal getaway.</p>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
                                        {[
                                            { id: 'Adventure', icon: '⛰️' },
                                            { id: 'Cultural immersion', icon: '🏛️' },
                                            { id: 'Pure Relaxation', icon: '🌴' },
                                            { id: 'A bit of everything', icon: '✨' }
                                        ].map(v => (
                                            <button
                                                key={v.id}
                                                onClick={() => { setTravelerProfile({ ...travelerProfile, vibe: v.id }); setDnaStep(2); }}
                                                style={{
                                                    padding: '32px 20px', borderRadius: 24, background: COLORS.background,
                                                    border: `2px solid ${travelerProfile.vibe === v.id ? COLORS.primary : COLORS.border}`,
                                                    cursor: 'pointer', transition: 'all 0.2s',
                                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16
                                                }}
                                                onMouseEnter={(e) => { if (travelerProfile.vibe !== v.id) e.currentTarget.style.borderColor = '#CCC'; }}
                                                onMouseLeave={(e) => { if (travelerProfile.vibe !== v.id) e.currentTarget.style.borderColor = COLORS.border; }}
                                            >
                                                <span style={{ fontSize: '3rem' }}>{v.icon}</span>
                                                <span style={{ fontSize: '1.2rem', fontWeight: 600, color: COLORS.textMain }}>{v.id}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {dnaStep === 2 && (
                                <div style={{ textAlign: 'center', animation: 'slideUp 0.4s ease-out' }}>
                                    <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: COLORS.textMain, marginBottom: 12 }}>What is your daily budget?</h2>
                                    <p style={{ fontSize: '1.1rem', color: COLORS.textMuted, marginBottom: 40 }}>Per person, excluding flights.</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                        {[
                                            { id: 'Budget-friendly', icon: '🎒', desc: 'Hostels, street food, public transport' },
                                            { id: 'Mid-range', icon: '🏨', desc: '3/4-star hotels, nice restaurants, cabs' },
                                            { id: 'Luxury', icon: '✨', desc: '5-star resorts, fine dining, private drivers' }
                                        ].map(b => (
                                            <button
                                                key={b.id}
                                                onClick={() => { setTravelerProfile({ ...travelerProfile, budget: b.id }); setDnaStep(3); }}
                                                style={{
                                                    padding: '24px 32px', borderRadius: 20, background: COLORS.background,
                                                    border: `2px solid ${travelerProfile.budget === b.id ? COLORS.primary : COLORS.border}`,
                                                    cursor: 'pointer', transition: 'all 0.2s',
                                                    display: 'flex', alignItems: 'center', gap: 24, textAlign: 'left'
                                                }}
                                                onMouseEnter={(e) => { if (travelerProfile.budget !== b.id) e.currentTarget.style.borderColor = '#CCC'; }}
                                                onMouseLeave={(e) => { if (travelerProfile.budget !== b.id) e.currentTarget.style.borderColor = COLORS.border; }}
                                            >
                                                <span style={{ fontSize: '2.5rem' }}>{b.icon}</span>
                                                <div>
                                                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: COLORS.textMain, marginBottom: 4 }}>{b.id}</div>
                                                    <div style={{ fontSize: '0.95rem', color: COLORS.textMuted }}>{b.desc}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {dnaStep === 3 && (
                                <div style={{ textAlign: 'center', animation: 'slideUp 0.4s ease-out' }}>
                                    <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: COLORS.textMain, marginBottom: 12 }}>How do you like to move?</h2>
                                    <p style={{ fontSize: '1.1rem', color: COLORS.textMuted, marginBottom: 40 }}>Choose your perfect travel pace.</p>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
                                        {[
                                            { id: 'Pack the day', icon: '🏃‍♂️', desc: "I want to see as much as possible, dawn to dusk." },
                                            { id: 'One big activity, then chill', icon: '☕', desc: "I like taking my time and soaking in the atmosphere." }
                                        ].map(p => (
                                            <button
                                                key={p.id}
                                                onClick={() => { setTravelerProfile({ ...travelerProfile, pace: p.id }); setDnaStep(4); }}
                                                style={{
                                                    padding: '32px 24px', borderRadius: 24, background: COLORS.background,
                                                    border: `2px solid ${travelerProfile.pace === p.id ? COLORS.primary : COLORS.border}`,
                                                    cursor: 'pointer', transition: 'all 0.2s',
                                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16
                                                }}
                                                onMouseEnter={(e) => { if (travelerProfile.pace !== p.id) e.currentTarget.style.borderColor = '#CCC'; }}
                                                onMouseLeave={(e) => { if (travelerProfile.pace !== p.id) e.currentTarget.style.borderColor = COLORS.border; }}
                                            >
                                                <span style={{ fontSize: '3rem' }}>{p.icon}</span>
                                                <span style={{ fontSize: '1.2rem', fontWeight: 600, color: COLORS.textMain }}>{p.id}</span>
                                                <span style={{ fontSize: '0.9rem', color: COLORS.textMuted, marginTop: 8 }}>{p.desc}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {dnaStep === 4 && (
                                <div style={{ textAlign: 'center', animation: 'slideUp 0.4s ease-out' }}>
                                    <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: COLORS.textMain, marginBottom: 12 }}>Select your top 3 interests</h2>
                                    <p style={{ fontSize: '1.1rem', color: COLORS.textMuted, marginBottom: 40 }}>What gets you most excited? ({travelerProfile.interests.length}/3 selected)</p>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center' }}>
                                        {[
                                            { id: 'Food & Cafes', icon: '🍳' },
                                            { id: 'Historical Sites', icon: '🏰' },
                                            { id: 'Nightlife', icon: '🍹' },
                                            { id: 'Spiritual/Temples', icon: '🛕' },
                                            { id: 'Hidden Gems', icon: '🗺️' }
                                        ].map(i => {
                                            const isSelected = travelerProfile.interests.includes(i.id);
                                            const disabled = !isSelected && travelerProfile.interests.length >= 3;
                                            return (
                                                <button
                                                    key={i.id}
                                                    onClick={() => handleInterestToggle(i.id)}
                                                    disabled={disabled}
                                                    style={{
                                                        padding: '16px 24px', borderRadius: 50, background: isSelected ? `${COLORS.primary}15` : COLORS.background,
                                                        border: `2px solid ${isSelected ? COLORS.primary : COLORS.border}`,
                                                        cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                                                        display: 'flex', alignItems: 'center', gap: 12,
                                                        opacity: disabled ? 0.5 : 1
                                                    }}
                                                >
                                                    <span style={{ fontSize: '1.5rem' }}>{i.icon}</span>
                                                    <span style={{ fontSize: '1rem', fontWeight: 600, color: isSelected ? COLORS.primary : COLORS.textMain }}>{i.id}</span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                    <div style={{ marginTop: 40 }}>
                                        <button
                                            onClick={() => setDnaStep(5)}
                                            disabled={travelerProfile.interests.length === 0}
                                            style={{
                                                padding: '16px 40px', background: travelerProfile.interests.length > 0 ? COLORS.textMain : COLORS.border,
                                                color: travelerProfile.interests.length > 0 ? '#FFF' : COLORS.textMuted,
                                                borderRadius: 50, fontSize: '1.1rem', fontWeight: 600, border: 'none',
                                                cursor: travelerProfile.interests.length > 0 ? 'pointer' : 'not-allowed', transition: 'all 0.2s'
                                            }}
                                        >
                                            Continue
                                        </button>
                                    </div>
                                </div>
                            )}

                            {dnaStep === 5 && (
                                <div style={{ textAlign: 'center', animation: 'slideUp 0.4s ease-out' }}>
                                    <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: COLORS.textMain, marginBottom: 12 }}>Any Must-Sees?</h2>
                                    <p style={{ fontSize: '1.1rem', color: COLORS.textMuted, marginBottom: 40 }}>Any specific spots you've seen on Instagram or Reels that we MUST include?</p>

                                    <textarea
                                        value={travelerProfile.mustSees}
                                        onChange={(e) => setTravelerProfile({ ...travelerProfile, mustSees: e.target.value })}
                                        placeholder="e.g. That famous cafe in Goa, or the sunset spot in Udaipur..."
                                        style={{
                                            width: '100%', minHeight: 180, padding: 24, borderRadius: 24,
                                            border: `2px solid ${COLORS.border}`, background: COLORS.background,
                                            fontSize: '1.1rem', color: COLORS.textMain, fontFamily: 'inherit',
                                            resize: 'vertical', outline: 'none', transition: 'border-color 0.2s'
                                        }}
                                        onFocus={(e) => e.target.style.borderColor = COLORS.primary}
                                        onBlur={(e) => e.target.style.borderColor = COLORS.border}
                                    />

                                    <div style={{ marginTop: 40 }}>
                                        <button
                                            onClick={handleGenerateItinerary}
                                            style={{
                                                padding: '16px 48px', background: `linear-gradient(45deg, ${COLORS.primary}, ${COLORS.secondary})`,
                                                color: '#FFF', borderRadius: 50, fontSize: '1.2rem', fontWeight: 700, border: 'none',
                                                cursor: 'pointer', boxShadow: `0 8px 24px rgba(255, 56, 92, 0.3)`, transition: 'transform 0.2s'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                        >
                                            Generate AI Itinerary ✨
                                        </button>
                                    </div>
                                </div>
                            )}

                            {isGeneratingItinerary && (
                                <div style={{ textAlign: 'center', animation: 'fadeIn 0.5s ease-out', padding: '60px 0' }}>
                                    <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: COLORS.textMain, marginBottom: 12 }}>Crafting your Safari...</h2>
                                    <p style={{ fontSize: '1.2rem', color: COLORS.primary, fontWeight: 600, marginBottom: 40, animation: 'pulse 1.5s infinite' }}>{loadingMessage}</p>
                                    <div style={{ display: 'inline-block', width: 64, height: 64, border: `6px solid ${COLORS.border}`, borderTopColor: COLORS.primary, borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                                    <p style={{ marginTop: 32, fontSize: '0.95rem', color: COLORS.textMuted }}>This usually takes about 15-30 seconds because real multi-agent scraping is happening.</p>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            )}

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
            `}} />
        </>
    );
}
