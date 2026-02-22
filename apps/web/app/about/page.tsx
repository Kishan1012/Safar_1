"use client";

import { motion } from 'framer-motion';

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

export default function AboutPage() {
    return (
        <div style={{ minHeight: '100vh', background: COLORS.background, paddingTop: 120 }}>
            {/* ─── Hero Section ────────────────────────────────────────────────── */}
            <motion.section
                initial="hidden" animate="visible" variants={fadeUp} transition={{ duration: 0.8, ease: "easeOut" }}
                className="section" style={{ padding: '60px 0 80px', textAlign: 'center' }}
            >
                <div className="container" style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px' }}>
                    <div style={{ color: COLORS.primary, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, fontSize: '0.85rem', marginBottom: 16 }}>Our Manifesto</div>
                    <h1 style={{ color: COLORS.textMain, fontSize: 'clamp(3rem, 5vw, 4.5rem)', fontWeight: 400, margin: 0, fontFamily: 'Georgia, serif', letterSpacing: '-1px', lineHeight: 1.1 }}>Redefining the art of modern exploration.</h1>
                </div>
            </motion.section>

            {/* ─── Story Section ──────────────────────────────────────────────────── */}
            <motion.section
                initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp} transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                className="section" style={{ padding: '0 0 100px' }}
            >
                <div className="container" style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px' }}>

                    <div style={{ width: '100%', height: '400px', borderRadius: 24, overflow: 'hidden', marginBottom: 60 }}>
                        <img src="https://images.unsplash.com/photo-1506461883276-594540eb36cb?auto=format&fit=crop&w=1200&q=80" alt="Mountain Landscape" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                        <p style={{ color: COLORS.textMain, fontSize: '1.4rem', lineHeight: 1.8, margin: 0, fontFamily: 'Georgia, serif', fontWeight: 400 }}>
                            Travel is no longer about checking boxes on a list. It is about immersion, finding the obscure cafes tucked away in narrow alleys, and experiencing the pulse of a city exactly as the locals do. At Safar, we believe the best itineraries are the ones uniquely attuned to your DNA.
                        </p>

                        <div style={{ height: 1, width: '100%', background: COLORS.border, margin: '20px 0' }}></div>

                        <p style={{ color: COLORS.textMuted, fontSize: '1.2rem', lineHeight: 1.8, margin: 0, fontFamily: 'Georgia, serif' }}>
                            We built Safar combining state-of-the-art AI agents with real-time mapping to bridge the gap between inspiration and reality. By scraping live data from social platforms and the web, we turn fleeting viral moments into concrete, actionable travel plans.
                        </p>

                        <p style={{ color: COLORS.textMuted, fontSize: '1.2rem', lineHeight: 1.8, margin: 0, fontFamily: 'Georgia, serif' }}>
                            South Asia is a tapestry of unmatched vibrancy—from the snow-capped majesty of the Himalayas to the lush backwaters of Kerala, and the electric energy of Mumbai. Our mission is to make its complexity accessible, beautiful, and deeply personal.
                        </p>
                    </div>

                </div>
            </motion.section>
        </div>
    );
}
