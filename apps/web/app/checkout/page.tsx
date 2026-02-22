"use client";

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const AFFILIATE_ID = '705363';

function CheckoutIframe() {
    const searchParams = useSearchParams();
    const dest = searchParams?.get('dest') || 'Destination';

    // Construct dynamic Travelpayouts Whitelabel Search
    // Assuming standard Hotellook/Aviasales widgets mapped to a marker
    const whiteLabelUrl = `https://whitelabel.travelpayouts.com/?marker=${AFFILIATE_ID}&language=en&currency=inr&destination=${encodeURIComponent(dest)}`;

    return (
        <div style={{ width: '100%', height: '100vh', background: '#0A0A0A', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '24px 32px', background: 'rgba(20,20,25,0.9)', borderBottom: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(16px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFF', margin: 0, letterSpacing: '-0.5px' }}>
                    Safar <span style={{ background: 'linear-gradient(135deg, #FF3D00 0%, #FF00E5 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Secure Checkout</span>
                </h1>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <a href="/planner" style={{ color: '#9CA3AF', textDecoration: 'none', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>←</span> Cancel
                    </a>
                    <a href="/planner?success=true" style={{ background: 'linear-gradient(135deg, #FF3D00 0%, #FF00E5 100%)', color: '#FFF', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 800, padding: '8px 16px', borderRadius: 50, transition: 'transform 0.2s', boxShadow: '0 4px 12px rgba(255,0,229,0.3)' }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                        TEST: Simulate Success ✓
                    </a>
                </div>
            </div>

            <div style={{ flex: 1, position: 'relative' }}>
                {/* Fallback loader while iframe mounts */}
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 0 }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-block', width: 48, height: 48, borderRadius: '50%', background: 'conic-gradient(from 0deg, #FF3D00, #FF00E5, transparent 60%)', WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 4px), #000 0)', mask: 'radial-gradient(farthest-side, transparent calc(100% - 4px), #000 0)', animation: 'spin 1s linear infinite' }}></div>
                        <p style={{ marginTop: 24, fontSize: '1.1rem', color: '#9CA3AF' }}>Setting up your secure bundle...</p>
                    </div>
                </div>

                {/* Secure iframe embedding Travelpayouts WL */}
                <iframe
                    src={whiteLabelUrl}
                    style={{ width: '100%', height: '100%', border: 'none', position: 'relative', zIndex: 10, background: 'transparent' }}
                    title="Travel Booking Checkout"
                    allow="payment"
                />
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes spin { 100% { transform: rotate(360deg); } }
            `}} />
        </div>
    );
}

export default function CheckoutPage() {
    return (
        <Suspense fallback={
            <div style={{ height: '100vh', width: '100%', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'inline-block', width: 48, height: 48, borderRadius: '50%', background: 'conic-gradient(from 0deg, #FF3D00, #FF00E5, transparent 60%)', WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 4px), #000 0)', mask: 'radial-gradient(farthest-side, transparent calc(100% - 4px), #000 0)', animation: 'spin 1s linear infinite' }}></div>
            </div>
        }>
            <CheckoutIframe />
        </Suspense>
    );
}
