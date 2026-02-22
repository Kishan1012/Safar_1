"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

const COLORS = {
    primary: '#FF385C',
    secondary: '#FF9933',
    surface: '#1E1E24',
    background: '#121214',
    textMain: '#F9FAFB',
    textMuted: '#9CA3AF',
    border: '#333338'
};

const fadeUp = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0 }
};

interface Story {
    id: string;
    title: string;
    destination: string;
    author: string;
    avatar: string;
    image: string;
    height: number;
    legend: {
        fact1: string;
        fact2: string;
        fact3: string;
    };
    agodaDeal: {
        propertyName: string;
        price: string;
        originalPrice: string;
        discount: string;
    }
}

const STORIES_DATA: Story[] = [
    {
        id: "1",
        title: "Lost in the Medina",
        destination: "Marrakech",
        author: "Ananya Patel",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80",
        image: "https://images.unsplash.com/photo-1548013146-72479768bada?q=80&w=800",
        height: 600,
        legend: {
            fact1: "The Koutoubia Mosque's minaret was used as a model for the Giralda in Seville.",
            fact2: "Mint tea here is poured from a height to create a frothy crown, known locally as the 'turban'.",
            fact3: "Jemaa el-Fnaa transforms completely at night, shifting from snake charmers to a massive open-air restaurant."
        },
        agodaDeal: {
            propertyName: "Riad Elegance",
            price: "$120",
            originalPrice: "$180",
            discount: "33% OFF"
        }
    },
    {
        id: "2",
        title: "Kyoto Zen Immersion",
        destination: "Kyoto",
        author: "Dev Sharma",
        avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=150&q=80",
        image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=800",
        height: 400,
        legend: {
            fact1: "Kyoto has exactly 1,600 Buddhist temples and 400 Shinto shrines.",
            fact2: "The Arashiyama Bamboo Grove produces a sound that the government voted as one of '100 Soundscapes of Japan'.",
            fact3: "Traditional machiya townhouses are known as 'unagi no nedoko' (eel's beds) because they are narrow but endlessly deep."
        },
        agodaDeal: {
            propertyName: "Kyoto Granbell Hotel",
            price: "$85",
            originalPrice: "$140",
            discount: "40% OFF"
        }
    },
    {
        id: "3",
        title: "Amalfi Coast Drive",
        destination: "Amalfi Coast",
        author: "Sofia Rossi",
        avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80",
        image: "https://images.unsplash.com/photo-1533676802871-eca1ae998cd5?q=80&w=800",
        height: 500,
        legend: {
            fact1: "The Amalfi Drive (SS163) was originally built by the Romans.",
            fact2: "Lemons grown here, 'Sfusato Amalfitano', are exceptionally sweet and used globally for Limoncello.",
            fact3: "Positano was a poor fishing village until John Steinbeck published a 1953 essay about it in Harper's Bazaar."
        },
        agodaDeal: {
            propertyName: "Hotel Miramalfi",
            price: "$310",
            originalPrice: "$450",
            discount: "31% OFF"
        }
    },
    {
        id: "4",
        title: "Tulum Jungle Retreat",
        destination: "Tulum",
        author: "Javier Cruz",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
        image: "https://images.unsplash.com/photo-1518182170546-276685f4007b?q=80&w=800",
        height: 450,
        legend: {
            fact1: "Tulum was one of the last cities built and inhabited by the Maya.",
            fact2: "The ruins are perched on 12-meter-tall cliffs facing the sunrise, originally named 'Zama' (City of Dawn).",
            fact3: "Its underground cenotes are part of the longest continuous underwater cave system on Earth."
        },
        agodaDeal: {
            propertyName: "Papaya Playa Project",
            price: "$250",
            originalPrice: "$380",
            discount: "34% OFF"
        }
    },
    {
        id: "5",
        title: "Santorini Blue Domes",
        destination: "Santorini",
        author: "Elena Niko",
        avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80",
        image: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac542?q=80&w=800",
        height: 550,
        legend: {
            fact1: "The island's original circular shape was destroyed by a volcanic eruption in 1600 BC, creating the caldera.",
            fact2: "Santorini's white paint originally utilized lime to disinfect homes during a cholera outbreak in 1938.",
            fact3: "The volcanic soil produces unique grapes for Assyrtiko wine, grown in basket-shaped vines to protect against wind."
        },
        agodaDeal: {
            propertyName: "Oia Mare Villas",
            price: "$400",
            originalPrice: "$550",
            discount: "27% OFF"
        }
    },
    {
        id: "6",
        title: "Swiss Alps Lodge",
        destination: "Zermatt",
        author: "Marcus Weber",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80",
        image: "https://images.unsplash.com/photo-1531366936336-62fb4bf14bf0?q=80&w=800",
        height: 400,
        legend: {
            fact1: "Zermatt is completely car-free to prevent air pollution from obscuring the view of the Matterhorn.",
            fact2: "The Matterhorn's distinctive pyramid shape was carved by glaciers moving outwards in four directions.",
            fact3: "The Glacier Express connecting Zermatt to St. Moritz crosses 291 bridges and goes through 91 tunnels."
        },
        agodaDeal: {
            propertyName: "The Omnia",
            price: "$520",
            originalPrice: "$600",
            discount: "13% OFF"
        }
    }
];

export default function StoriesPage() {
    const [selectedStory, setSelectedStory] = useState<Story | null>(null);

    // Disable body scroll when modal is open
    useEffect(() => {
        if (selectedStory) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; }
    }, [selectedStory]);

    return (
        <div style={{ minHeight: '100vh', background: COLORS.background, paddingTop: 100 }}>
            {/* ─── Hero Section ────────────────────────────────────────────────── */}
            <motion.section
                initial="hidden" animate="visible" variants={fadeUp} transition={{ duration: 0.8, ease: "easeOut" }}
                className="section" style={{ padding: '40px 0 60px', textAlign: 'center' }}
            >
                <div className="container" style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px' }}>
                    <div style={{ color: COLORS.primary, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, fontSize: '0.85rem', marginBottom: 12 }}>Editorial</div>
                    <h1 style={{ color: COLORS.textMain, fontSize: 'clamp(3rem, 5vw, 4.5rem)', fontWeight: 400, fontFamily: 'Georgia, serif', margin: 0, letterSpacing: '-1px' }}>Voices of the Journey</h1>
                    <p style={{ color: COLORS.textMuted, marginTop: 16, fontSize: '1.2rem', lineHeight: 1.6 }}>Cinematic dispatches and hidden legends from our traveler community.</p>
                </div>
            </motion.section>

            {/* ─── Masonry Grid ──────────────────────────────────────────────────── */}
            <section className="section" style={{ padding: '0 24px 100px', maxWidth: 1400, margin: '0 auto' }}>
                <style dangerouslySetInnerHTML={{
                    __html: `
                    .masonry-grid {
                        column-count: 1;
                        column-gap: 24px;
                    }
                    @media (min-width: 768px) {
                        .masonry-grid { column-count: 2; }
                    }
                    @media (min-width: 1024px) {
                        .masonry-grid { column-count: 3; }
                    }
                    .masonry-item {
                        break-inside: avoid;
                        margin-bottom: 24px;
                        position: relative;
                        border-radius: 0;
                        overflow: hidden;
                        cursor: pointer;
                        cursor: zoom-in;
                    }
                    .masonry-item img {
                        width: 100%;
                        display: block;
                        transition: transform 0.8s cubic-bezier(0.25, 1, 0.5, 1);
                    }
                    .masonry-item:hover img {
                        transform: scale(1.05);
                    }
                    .masonry-overlay {
                        position: absolute;
                        inset: 0;
                        background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 50%);
                        opacity: 0;
                        transition: opacity 0.4s ease;
                        display: flex;
                        flex-direction: column;
                        justify-content: flex-end;
                        padding: 24px;
                    }
                    .masonry-item:hover .masonry-overlay {
                        opacity: 1;
                    }
                `}} />

                <div className="masonry-grid">
                    {STORIES_DATA.map((story, i) => (
                        <motion.div
                            key={story.id}
                            className="masonry-item"
                            onClick={() => setSelectedStory(story)}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: "50px" }}
                            variants={fadeUp}
                            transition={{ duration: 0.6, ease: "easeOut", delay: i * 0.1 }}
                        >
                            <img src={story.image} alt={story.title} style={{ height: story.height, objectFit: 'cover' }} />
                            <div className="masonry-overlay">
                                <span style={{ color: COLORS.primary, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700, marginBottom: 8 }}>{story.destination}</span>
                                <h3 style={{ color: '#FFF', fontSize: '1.8rem', fontFamily: 'Georgia, serif', fontWeight: 400, margin: '0 0 8px', lineHeight: 1.1 }}>{story.title}</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <img src={story.avatar} style={{ width: 24, height: 24, borderRadius: '50%' }} />
                                    <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem' }}>{story.author}</span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* ─── Immersive Story Modal ──────────────────────────────────────────── */}
            <AnimatePresence>
                {selectedStory && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 900, // Important: 900 so Navbar at 1000 stays visible
                            background: 'rgba(10, 10, 12, 0.85)',
                            backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)',
                            display: 'flex',
                            flexDirection: 'column',
                            paddingTop: 80 // Clear the global navbar
                        }}
                    >
                        {/* Close Button Mobile (Desktop can use outside click, but let's have explicit close) */}
                        <button
                            onClick={() => setSelectedStory(null)}
                            style={{ position: 'absolute', top: 100, right: 30, background: 'rgba(255,255,255,0.1)', border: 'none', color: '#FFF', width: 44, height: 44, borderRadius: '50%', cursor: 'pointer', zIndex: 100, backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', transition: 'background 0.2s' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                        >
                            ✕
                        </button>

                        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', flexDirection: 'row' }}>
                            <style dangerouslySetInnerHTML={{
                                __html: `
                                @media (max-width: 900px) {
                                    .modal-content-wrapper { flex-direction: column-reverse !important; overflow-y: auto; }
                                    .modal-left { width: 100% !important; border-right: none !important; }
                                    .modal-right { width: 100% !important; min-height: 50vh; }
                                    .revenue-card { position: relative !important; bottom: auto !important; margin-top: 24px; }
                                }
                            `}} />

                            <div className="modal-content-wrapper" style={{ display: 'flex', flex: 1, width: '100%', flexDirection: 'row' }}>

                                {/* ─── LEFT: Cinematic Legend ─── */}
                                <motion.div
                                    className="modal-left"
                                    initial={{ x: -40, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ duration: 0.5, delay: 0.2 }}
                                    style={{ width: '45%', padding: '60px 8%', display: 'flex', flexDirection: 'column', justifyContent: 'center', borderRight: `1px solid rgba(255,255,255,0.05)`, overflowY: 'auto', position: 'relative' }}
                                >
                                    <div style={{ marginBottom: 40 }}>
                                        <div style={{ color: COLORS.primary, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700, marginBottom: 16 }}>{selectedStory.destination}</div>
                                        <h2 style={{ fontSize: '3rem', fontFamily: 'Georgia, serif', fontWeight: 400, color: '#FFF', margin: '0 0 24px', lineHeight: 1.1 }}>{selectedStory.title}</h2>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <img src={selectedStory.avatar} style={{ width: 40, height: 40, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)' }} />
                                            <div>
                                                <div style={{ color: '#FFF', fontWeight: 600, fontSize: '0.95rem' }}>{selectedStory.author}</div>
                                                <div style={{ color: COLORS.textMuted, fontSize: '0.8rem' }}>Safar Explorer</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: 3, color: COLORS.textMuted, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 12, marginBottom: 24 }}>The Cinematic Legend</h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                            <p style={{ color: '#E5E7EB', fontSize: '1.25rem', lineHeight: 1.6, margin: 0, fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
                                                "{selectedStory.legend.fact1}"
                                            </p>
                                            <p style={{ color: '#E5E7EB', fontSize: '1.25rem', lineHeight: 1.6, margin: 0, fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
                                                "{selectedStory.legend.fact2}"
                                            </p>
                                            <p style={{ color: '#E5E7EB', fontSize: '1.25rem', lineHeight: 1.6, margin: 0, fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
                                                "{selectedStory.legend.fact3}"
                                            </p>
                                        </div>
                                    </div>

                                    {/* Smart Revenue Agoda Overlay (Desktop bottom left, Mobile inline) */}
                                    <motion.div
                                        className="revenue-card"
                                        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}
                                        style={{ position: 'absolute', bottom: 40, left: '8%', right: '8%', background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                                    >
                                        <div>
                                            <div style={{ color: COLORS.textMuted, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Agoda Flash Deal</div>
                                            <div style={{ color: '#FFF', fontWeight: 700, fontSize: '1.1rem' }}>{selectedStory.agodaDeal.propertyName}</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                                                <span style={{ color: '#FFF', fontWeight: 800, fontSize: '1.2rem' }}>{selectedStory.agodaDeal.price}</span>
                                                <span style={{ color: COLORS.textMuted, textDecoration: 'line-through', fontSize: '0.9rem' }}>{selectedStory.agodaDeal.originalPrice}</span>
                                                <span style={{ background: 'rgba(0, 230, 118, 0.15)', color: '#00E676', padding: '2px 8px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 800 }}>{selectedStory.agodaDeal.discount}</span>
                                            </div>
                                        </div>
                                        <a
                                            href={`https://www.agoda.com/partners/partnersearch.aspx?cid=705363&pcs=1&city=${selectedStory.destination}`}
                                            target="_blank" rel="noopener noreferrer"
                                            style={{ background: `linear-gradient(45deg, ${COLORS.primary}, ${COLORS.secondary})`, color: '#FFF', padding: '12px 24px', borderRadius: 50, fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 15px rgba(255,56,92,0.3)', transition: 'transform 0.2s' }}
                                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                        >
                                            Book Stay
                                        </a>
                                    </motion.div>

                                </motion.div>

                                {/* ─── RIGHT: High-Res Image & CTA ─── */}
                                <motion.div
                                    className="modal-right"
                                    initial={{ scale: 0.95, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ duration: 0.6 }}
                                    style={{ width: '55%', position: 'relative' }}
                                >
                                    <div style={{ position: 'absolute', inset: 0, padding: 40, paddingBottom: 60, paddingRight: 60 }}>
                                        <div style={{ width: '100%', height: '100%', borderRadius: 32, overflow: 'hidden', position: 'relative', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
                                            <img src={selectedStory.image} alt={selectedStory.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

                                            {/* CTA Overlay over image */}
                                            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 40%)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 40 }}>
                                                <Link href={`/planner?destination=${encodeURIComponent(selectedStory.destination)}`}>
                                                    <button style={{
                                                        background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                                                        border: '1px solid rgba(255,255,255,0.2)', color: '#FFF',
                                                        padding: '16px 40px', borderRadius: 50, fontSize: '1.2rem', fontWeight: 600,
                                                        display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                                                        boxShadow: '0 10px 30px rgba(0,0,0,0.3)', transition: 'all 0.3s'
                                                    }}
                                                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                                    >
                                                        ✨ View This Itinerary
                                                    </button>
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>

                            </div>
                        </div>

                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
