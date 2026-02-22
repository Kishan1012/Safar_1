"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTripBasket } from '../store/useTripBasket';
import { formatINR } from './livePricing';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../utils/supabase';

export default function SummarySelection({ destination, onBack }: { destination: string, onBack: () => void }) {
    const { items: basketItems, getTotal } = useTripBasket();
    const [hasInsurance, setHasInsurance] = useState(false);
    const router = useRouter();

    const INSURANCE_PREMIUM = 1250;
    const finalTotal = getTotal() + (hasInsurance ? INSURANCE_PREMIUM : 0);
    const destName = destination.split(',')[0];

    // Static Mapbox thumbnail (could use static map API in production)
    const mapThumbnail = `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/${basketItems.length > 0 ? 'auto' : '0,0,1'}/600x300?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "pk.eyJ1Ijoia2lzaGFuc2luZ2gxMDEyMyIsImEiOiJjbWx3d2x1OGQwb2g2M2RwcXd0djh1bzdlIn0.XueJxn6rUS0BjWYZ9At0Tw"}`;

    const { user, openAuthModal } = useAuthStore();
    const [isSaving, setIsSaving] = useState(false);

    const handleSaveTrip = async () => {
        if (!user) {
            openAuthModal();
            return;
        }

        setIsSaving(true);
        if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
            await supabase.from('user_trips').insert([{
                user_id: user.id,
                destination: destName,
                total: finalTotal,
                basket: basketItems,
                img: mapThumbnail,
                created_at: new Date()
            }]);
        } else {
            await new Promise(r => setTimeout(r, 800)); // Simulate save
        }
        setIsSaving(false);
        alert('Master Itinerary Saved to My Plans! ✅');
    };

    const handleCheckout = () => {
        // Here we could save the basket to a backend or just pass amount via URL
        router.push(`/checkout?total=${finalTotal}&dest=${encodeURIComponent(destName)}`);
    };

    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const handleDownloadPDF = async () => {
        setIsGeneratingPDF(true);
        const element = document.getElementById('master-summary-content');
        if (element) {
            try {
                const html2canvas = (await import('html2canvas')).default;
                const { jsPDF } = await import('jspdf');

                const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#111' });
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                pdf.save(`Safar_Itinerary_${destName}.pdf`);
            } catch (error) {
                console.error("PDF generation failed", error);
            }
        }
        setIsGeneratingPDF(false);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{ width: '100%', maxWidth: 800, margin: '0 auto', padding: '120px 20px 100px', color: '#FFF' }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
                <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#FFF', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 50, transition: 'background 0.2s' }}>
                    ← Back to Hotels
                </button>
                <button onClick={handleDownloadPDF} disabled={isGeneratingPDF} style={{ background: 'rgba(255,56,92,0.15)', border: '1px solid #FF385C', color: '#FF385C', cursor: isGeneratingPDF ? 'wait' : 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 50, transition: 'all 0.2s', fontWeight: 600 }}>
                    {isGeneratingPDF ? 'Generating...' : '📄 Download PDF'}
                </button>
            </div>

            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '3.5rem', fontWeight: 800, marginBottom: 8, letterSpacing: '-1px' }}>Your {destName} Escape</h1>
            <p style={{ fontSize: '1.2rem', color: '#9CA3AF', marginBottom: 48 }}>Review your custom itinerary and final pricing.</p>

            <div id="master-summary-content" style={{ padding: '24px', background: '#111', borderRadius: 32, margin: '-24px', marginBottom: 24 }}>
                <div style={{ background: 'rgba(30, 30, 36, 0.4)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 24, overflow: 'hidden', marginBottom: 48, backdropFilter: 'blur(12px)' }}>
                    {/* Mapbox Route Thumbnail */}
                    <div style={{ width: '100%', height: 200, background: `url(${mapThumbnail}) center/cover no-repeat`, borderBottom: '1px solid rgba(255,255,255,0.1)', position: 'relative' }}>
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(30,30,36,1), transparent)' }}></div>
                    </div>

                    <div style={{ padding: '32px' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Trip Breakdown</h2>

                        {basketItems.length === 0 ? (
                            <p style={{ color: '#9CA3AF' }}>Your basket is empty. Go back and add some items!</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {basketItems.map((item, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <div style={{ fontSize: '0.85rem', color: '#FF00E5', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, fontWeight: 700 }}>{item.type}</div>
                                            <div style={{ fontSize: '1.1rem', color: '#FFF' }}>{item.title}</div>
                                        </div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{formatINR(item.priceINR)}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Insurance Upsell */}
                <div style={{ background: hasInsurance ? 'rgba(255, 0, 229, 0.1)' : 'rgba(30, 30, 36, 0.6)', border: `2px solid ${hasInsurance ? '#FF00E5' : 'rgba(255,255,255,0.05)'}`, borderRadius: 24, padding: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', transition: 'all 0.3s', backdropFilter: 'blur(12px)', marginBottom: 48 }} onClick={() => setHasInsurance(!hasInsurance)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                        <div style={{ fontSize: '3rem' }}>🛡️</div>
                        <div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 4 }}>Travel Protection by VisitorsCoverage</div>
                            <div style={{ fontSize: '0.95rem', color: '#9CA3AF', maxWidth: 400 }}>Add comprehensive trip cancellation, medical, and delay coverage for peace of mind.</div>
                            <a href={`https://www.visitorscoverage.com/?marker=705363`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ color: '#FF00E5', fontSize: '0.85rem', marginTop: 8, display: 'inline-block' }}>Learn more</a>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FFF' }}>{formatINR(INSURANCE_PREMIUM)}</div>
                        {/* Toggle UI */}
                        <div style={{ width: 56, height: 32, background: hasInsurance ? 'linear-gradient(135deg, #FF3D00 0%, #FF00E5 100%)' : 'rgba(255,255,255,0.1)', borderRadius: 32, position: 'relative', transition: 'background 0.3s' }}>
                            <div style={{ position: 'absolute', top: 4, left: hasInsurance ? 28 : 4, width: 24, height: 24, borderRadius: '50%', background: '#FFF', transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Final Total Bar */}
            <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <div style={{ fontSize: '1rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Total Amount</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '3rem', fontWeight: 800, color: '#FFF' }}>{formatINR(finalTotal)}</div>
                        <div style={{ fontSize: '1.2rem', color: '#666', textDecoration: 'line-through' }}>{formatINR(finalTotal * 1.15)}</div>
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#FF00E5', marginTop: 4 }}>You saved {formatINR(finalTotal * 0.15)} with this bundle</div>
                </div>

                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <button
                        onClick={handleSaveTrip}
                        disabled={isSaving || basketItems.length === 0}
                        style={{
                            padding: '20px 32px', background: 'rgba(255,255,255,0.1)', color: '#FFF', borderRadius: 50,
                            fontSize: '1.1rem', fontWeight: 700, border: '1px solid rgba(255,255,255,0.1)', cursor: isSaving ? 'wait' : (basketItems.length === 0 ? 'not-allowed' : 'pointer'),
                            transition: 'all 0.2s', opacity: (isSaving || basketItems.length === 0) ? 0.5 : 1
                        }}>
                        {isSaving ? 'Saving...' : '💾 Save to My Plans'}
                    </button>
                    <button
                        onClick={handleCheckout}
                        disabled={basketItems.length === 0}
                        style={{
                            padding: '20px 48px', background: basketItems.length === 0 ? '#333' : 'linear-gradient(135deg, #FF3D00 0%, #FF00E5 100%)', color: '#FFF', borderRadius: 50,
                            fontSize: '1.2rem', fontWeight: 800, border: 'none', cursor: basketItems.length === 0 ? 'not-allowed' : 'pointer',
                            boxShadow: basketItems.length === 0 ? 'none' : '0 8px 32px rgba(255,0,229,0.4)', transition: 'all 0.2s',
                            opacity: basketItems.length === 0 ? 0.5 : 1
                        }}>
                        Complete Booking →
                    </button>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap');
                `
            }} />
        </motion.div>
    );
}
