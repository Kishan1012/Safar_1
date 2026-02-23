"use client";

import { useState, Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';

const ItineraryResults = dynamic(() => import('../../components/ItineraryResults'), {
    ssr: false,
});
import { getFlashDeal, HotelDeal } from '../../services/travelpayouts';

const COLORS = {
    primary: '#FF385C',
    secondary: '#FF9933',
    surface: '#1E1E24',
    background: '#121214',
    textMain: '#F9FAFB',
    textMuted: '#9CA3AF',
    border: '#333338'
};

function PlannerContent() {
    const searchParams = useSearchParams();

    const initialOrigin = searchParams.get('origin') || "";
    const initialDestination = searchParams.get('destination') || "";

    const [step, setStep] = useState(1);
    const [isGeneratingItinerary, setIsGeneratingItinerary] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [itineraryResult, setItineraryResult] = useState<any>(null);
    const [loadingMessage, setLoadingMessage] = useState("Analyzing your traveler DNA...");
    const [flashDeal, setFlashDeal] = useState<HotelDeal | null>(null);

    const [originQuery, setOriginQuery] = useState(initialOrigin);
    const [destinationQuery, setDestinationQuery] = useState(initialDestination);
    const [checkInDate, setCheckInDate] = useState("");
    const [checkOutDate, setCheckOutDate] = useState("");

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

    // Auto-fetch flash deals when destination and dates exist
    useEffect(() => {
        if (step === 2 && destinationQuery && checkInDate && checkOutDate) {
            getFlashDeal(destinationQuery.split(',')[0], checkInDate, checkOutDate)
                .then(deal => setFlashDeal(deal));
        }
    }, [step, destinationQuery, checkInDate, checkOutDate]);

    // Confetti effect on successful mock checkout
    useEffect(() => {
        if (searchParams.get('success') === 'true') {
            import('canvas-confetti').then((module) => {
                const confetti = module.default;
                confetti({
                    particleCount: 150,
                    spread: 80,
                    origin: { y: 0.4 },
                    colors: ['#00E676', '#FF385C', '#FFD700'],
                    zIndex: 9999
                });
            }).catch(err => console.error("Confetti failed to load gracefully:", err));
            // Clean URL to prevent re-triggering
            window.history.replaceState(null, '', '/planner');
        }
    }, [searchParams]);

    const handleGenerateItinerary = async () => {
        if (!destinationQuery) {
            alert("Destination is required!");
            return;
        }

        setIsGeneratingItinerary(true);
        setLoadingMessage("Crafting your Safari...");

        const payload = {
            origin: originQuery || "New York",
            destination: destinationQuery.split(',')[0] || destinationQuery,
            check_in: checkInDate,
            check_out: checkOutDate,
            vibe: travelerProfile.vibe,
            budget: travelerProfile.budget,
            pace: travelerProfile.pace,
            must_sees: travelerProfile.mustSees,
            trip_id: "trip_" + Math.random().toString(36).substring(2, 9)
        };

        try {
            const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || "https://kishansingh1212.app.n8n.cloud/webhook-test/43353bb1-e944-4cb8-9288-808076c4dbcc";
            const res = await fetch(webhookUrl, {
                method: "POST",
                mode: 'cors',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const textData = await res.text();
                try {
                    const data = JSON.parse(textData);
                    setItineraryResult(data);
                } catch (parseError) {
                    const firstBrace = textData.indexOf('{');
                    const lastBrace = textData.lastIndexOf('}');
                    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                        try {
                            const data = JSON.parse(textData.substring(firstBrace, lastBrace + 1));
                            setItineraryResult(data);
                        } catch (e) {
                            setItineraryResult({ output: textData });
                        }
                    } else {
                        setItineraryResult({ output: textData });
                    }
                }
                setShowResults(true);
            } else {
                throw new Error(`Status: ${res.status}`);
            }
        } catch (error) {
            console.error(error);
            alert("Connection to Safari Brain failed. Check your local server/n8n.");
        } finally {
            setIsGeneratingItinerary(false);
        }
    };

    if (showResults) {
        return <ItineraryResults onBack={() => setShowResults(false)} itineraryData={itineraryResult} origin={originQuery} budget={travelerProfile.budget} />;
    }

    return (
        <div style={{ minHeight: '100vh', background: COLORS.background, paddingTop: 100, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                style={{ width: '100%', maxWidth: 800, padding: 20 }}
            >
                {!isGeneratingItinerary ? (
                    <div style={{ background: 'rgba(30,30,36,0.5)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderRadius: 32, border: `1px solid rgba(255,255,255,0.1)`, padding: 48, boxShadow: '0 24px 64px rgba(0,0,0,0.5)', overflow: 'hidden' }}>

                        <AnimatePresence mode="wait">
                            {step === 1 && (
                                <motion.div
                                    key="step1"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: COLORS.textMain, marginBottom: 8, textAlign: 'center', letterSpacing: '-1px' }}>Discover Your Travel DNA</h1>
                                    <p style={{ fontSize: '1.1rem', color: COLORS.textMuted, marginBottom: 40, textAlign: 'center' }}>Let's start by defining the soul of your upcoming journey.</p>

                                    {/* Vibe Selection */}
                                    <div style={{ marginBottom: 40 }}>
                                        <h3 style={{ fontSize: '1.2rem', color: COLORS.textMain, marginBottom: 16 }}>1. What's the overarching vibe?</h3>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
                                            {[
                                                { id: 'Adventure', icon: '⛰️' },
                                                { id: 'Cultural', icon: '🏛️' },
                                                { id: 'Relaxation', icon: '🌴' },
                                                { id: 'Everything', icon: '✨' }
                                            ].map(v => (
                                                <button
                                                    key={v.id}
                                                    onClick={() => setTravelerProfile({ ...travelerProfile, vibe: v.id })}
                                                    style={{
                                                        padding: '24px 16px', borderRadius: 20, background: travelerProfile.vibe === v.id ? `${COLORS.primary}20` : 'rgba(0,0,0,0.2)',
                                                        border: `2px solid ${travelerProfile.vibe === v.id ? COLORS.primary : 'rgba(255,255,255,0.05)'}`,
                                                        cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12
                                                    }}
                                                    className="hover-card"
                                                >
                                                    <span style={{ fontSize: '2.5rem' }}>{v.icon}</span>
                                                    <span style={{ fontSize: '1.1rem', fontWeight: 600, color: travelerProfile.vibe === v.id ? COLORS.primary : COLORS.textMain }}>{v.id}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Interests Selection */}
                                    <div style={{ marginBottom: 48 }}>
                                        <h3 style={{ fontSize: '1.2rem', color: COLORS.textMain, marginBottom: 16 }}>2. Select your top 3 interests</h3>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                                            {[
                                                { id: 'Food & Cafes', icon: '🍳' },
                                                { id: 'Historical Sites', icon: '🏰' },
                                                { id: 'Nightlife', icon: '🍹' },
                                                { id: 'Spiritual', icon: '🛕' },
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
                                                            padding: '14px 24px', borderRadius: 50, background: isSelected ? `${COLORS.primary}15` : 'rgba(0,0,0,0.2)',
                                                            border: `2px solid ${isSelected ? COLORS.primary : 'rgba(255,255,255,0.05)'}`,
                                                            cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                                                            display: 'flex', alignItems: 'center', gap: 10,
                                                            opacity: disabled ? 0.5 : 1
                                                        }}
                                                        className={!disabled ? "hover-card" : ""}
                                                    >
                                                        <span style={{ fontSize: '1.2rem' }}>{i.icon}</span>
                                                        <span style={{ fontSize: '1rem', fontWeight: 600, color: isSelected ? COLORS.primary : COLORS.textMain }}>{i.id}</span>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                        <button
                                            onClick={() => setStep(2)}
                                            disabled={!travelerProfile.vibe || travelerProfile.interests.length === 0}
                                            style={{
                                                padding: '16px 40px', background: (!travelerProfile.vibe || travelerProfile.interests.length === 0) ? 'rgba(255,255,255,0.1)' : COLORS.primary,
                                                color: (!travelerProfile.vibe || travelerProfile.interests.length === 0) ? 'rgba(255,255,255,0.3)' : '#FFF', borderRadius: 50, fontSize: '1.1rem', fontWeight: 800, border: 'none',
                                                cursor: (!travelerProfile.vibe || travelerProfile.interests.length === 0) ? 'not-allowed' : 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            Next: Logistics →
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {step === 2 && (
                                <motion.div
                                    key="step2"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: COLORS.textMuted, cursor: 'pointer', marginBottom: 20, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                                        ← Back to DNA
                                    </button>

                                    <h2 style={{ fontSize: '2rem', fontWeight: 800, color: COLORS.textMain, marginBottom: 32 }}>Where and When?</h2>

                                    <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: '0.85rem', color: COLORS.textMuted, fontWeight: 600, marginBottom: 8, display: 'block' }}>From (Origin)</label>
                                            <input
                                                type="text"
                                                value={originQuery}
                                                onChange={(e) => setOriginQuery(e.target.value)}
                                                placeholder="e.g. New York"
                                                style={{ width: '100%', padding: '16px 20px', borderRadius: 16, background: 'rgba(0,0,0,0.3)', border: `1px solid ${COLORS.border}`, color: COLORS.textMain, fontSize: '1rem', outline: 'none' }}
                                            />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: '0.85rem', color: COLORS.textMuted, fontWeight: 600, marginBottom: 8, display: 'block' }}>To (Destination)</label>
                                            <input
                                                type="text"
                                                value={destinationQuery}
                                                onChange={(e) => setDestinationQuery(e.target.value)}
                                                placeholder="e.g. Mumbai"
                                                style={{ width: '100%', padding: '16px 20px', borderRadius: 16, background: 'rgba(0,0,0,0.3)', border: `1px solid ${COLORS.border}`, color: COLORS.textMain, fontSize: '1rem', outline: 'none' }}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: 16, marginBottom: 40 }}>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: '0.85rem', color: COLORS.textMuted, fontWeight: 600, marginBottom: 8, display: 'block' }}>Check In</label>
                                            <input
                                                type="date"
                                                value={checkInDate}
                                                onChange={(e) => setCheckInDate(e.target.value)}
                                                style={{
                                                    width: '100%', padding: '16px 20px', borderRadius: 16, background: 'rgba(0,0,0,0.3)', border: `1px solid ${COLORS.border}`,
                                                    color: checkInDate ? COLORS.textMain : COLORS.textMuted, fontSize: '1rem', outline: 'none', fontFamily: 'inherit'
                                                }}
                                            />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: '0.85rem', color: COLORS.textMuted, fontWeight: 600, marginBottom: 8, display: 'block' }}>Check Out</label>
                                            <input
                                                type="date"
                                                value={checkOutDate}
                                                onChange={(e) => setCheckOutDate(e.target.value)}
                                                style={{
                                                    width: '100%', padding: '16px 20px', borderRadius: 16, background: 'rgba(0,0,0,0.3)', border: `1px solid ${COLORS.border}`,
                                                    color: checkOutDate ? COLORS.textMain : COLORS.textMuted, fontSize: '1rem', outline: 'none', fontFamily: 'inherit'
                                                }}
                                                min={checkInDate}
                                            />
                                        </div>
                                    </div>

                                    {/* Budget Selection */}
                                    <div style={{ marginBottom: 40 }}>
                                        <h3 style={{ fontSize: '1.2rem', color: COLORS.textMain, marginBottom: 16 }}>What's your daily budget? (Excl. flights)</h3>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                                            {[
                                                { id: 'Budget-friendly', icon: '🎒', desc: 'Hostels, street food' },
                                                { id: 'Mid-range', icon: '🏨', desc: '4-star hotels, cabs' },
                                                { id: 'Luxury', icon: '✨', desc: '5-star resorts, private' }
                                            ].map(b => (
                                                <button
                                                    key={b.id}
                                                    onClick={() => setTravelerProfile({ ...travelerProfile, budget: b.id })}
                                                    style={{
                                                        padding: '20px', borderRadius: 20, background: travelerProfile.budget === b.id ? `${COLORS.secondary}20` : 'rgba(0,0,0,0.2)',
                                                        border: `2px solid ${travelerProfile.budget === b.id ? COLORS.secondary : 'rgba(255,255,255,0.05)'}`,
                                                        cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 16, textAlign: 'left'
                                                    }}
                                                    className="hover-card"
                                                >
                                                    <span style={{ fontSize: '2rem' }}>{b.icon}</span>
                                                    <div>
                                                        <div style={{ fontSize: '1.05rem', fontWeight: 700, color: travelerProfile.budget === b.id ? COLORS.secondary : COLORS.textMain }}>{b.id}</div>
                                                        <div style={{ fontSize: '0.85rem', color: COLORS.textMuted, marginTop: 4 }}>{b.desc}</div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Mid-Funnel Insta-Deal Hook */}
                                    {flashDeal && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            style={{
                                                marginBottom: 32, padding: 16, borderRadius: 24, border: `1px solid #00E676`,
                                                background: 'linear-gradient(135deg, rgba(0,230,118,0.1), rgba(0,230,118,0.02))',
                                                display: 'flex', alignItems: 'center', gap: 20, boxShadow: '0 8px 32px rgba(0,230,118,0.15)'
                                            }}
                                        >
                                            <div style={{ width: 80, height: 80, borderRadius: 16, overflow: 'hidden', flexShrink: 0 }}>
                                                <img src={flashDeal.img} alt={flashDeal.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#00E676', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>⚡ Flash Deal Found</div>
                                                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FFF', margin: '0 0 4px' }}>{flashDeal.title}</h4>
                                                <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>Starting from <strong style={{ color: '#00E676', fontSize: '1rem' }}>{flashDeal.currency}{flashDeal.price}</strong>/night</p>
                                            </div>
                                            <a href={flashDeal.affiliateUrl} target="_blank" rel="noreferrer" style={{
                                                padding: '12px 24px', background: '#00E676', color: '#000', borderRadius: 50, fontSize: '0.9rem', fontWeight: 800, textDecoration: 'none', boxShadow: '0 4px 16px rgba(0,230,118,0.4)', transition: 'all 0.2s', textShadow: '0 0 2px rgba(255,255,255,0.5)'
                                            }} className="pulse-btn-vibrant">
                                                Book Now
                                            </a>
                                        </motion.div>
                                    )}

                                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                                        <button
                                            onClick={handleGenerateItinerary}
                                            disabled={!destinationQuery || !travelerProfile.budget || !checkInDate || !checkOutDate}
                                            style={{
                                                padding: '20px 60px', width: '100%', background: (!destinationQuery || !travelerProfile.budget || !checkInDate || !checkOutDate) ? COLORS.border : `linear-gradient(45deg, #FF385C, #FF9933)`,
                                                color: (!destinationQuery || !travelerProfile.budget || !checkInDate || !checkOutDate) ? COLORS.textMuted : '#FFF', borderRadius: 50, fontSize: '1.2rem', fontWeight: 800, border: 'none',
                                                cursor: (!destinationQuery || !travelerProfile.budget || !checkInDate || !checkOutDate) ? 'not-allowed' : 'pointer',
                                                boxShadow: (!destinationQuery || !travelerProfile.budget || !checkInDate || !checkOutDate) ? 'none' : `0 12px 32px rgba(255,56,92,0.3)`, transition: 'all 0.2s'
                                            }}
                                            className={(!destinationQuery || !travelerProfile.budget || !checkInDate || !checkOutDate) ? "" : "pulse-btn"}
                                        >
                                            Generate AI Itinerary ✨
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '60px 0', margin: 'auto' }}>
                        <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: COLORS.textMain, marginBottom: 12 }}>Crafting your Safari...</h2>
                        <p style={{ fontSize: '1.2rem', color: COLORS.primary, fontWeight: 600, marginBottom: 40 }}>{loadingMessage}</p>
                        <div style={{ display: 'inline-block', width: 64, height: 64, border: `6px solid ${COLORS.border}`, borderTopColor: COLORS.primary, borderRadius: '50%' }}></div>
                        <p style={{ marginTop: 32, fontSize: '0.95rem', color: COLORS.textMuted }}>This usually takes about 15-30 seconds because real multi-agent scraping is happening.</p>
                    </div>
                )}
            </motion.div>
        </div>
    );
}

export default function PlannerPage() {
    return (
        <Suspense fallback={<div style={{ minHeight: '100vh', background: COLORS.background, paddingTop: 120, textAlign: 'center', color: COLORS.textMain }}>Loading Planner...</div>}>
            <PlannerContent />
        </Suspense>
    );
}
