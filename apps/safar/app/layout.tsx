import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'Safar — AI Travel Planning for India 🇮🇳',
    description: 'Apni dream trip banao in seconds. Save spots from Instagram Reels & YouTube Shorts, plan optimized routes across India.',
    keywords: ['travel india', 'trip planner india', 'yatra planning', 'safar', 'bharat travel', 'AI travel'],
    openGraph: {
        title: 'Safar — AI Travel Planning for India',
        description: 'From Instagram Reels to a perfect itinerary across Rajasthan, Kerala, Goa and beyond.',
        type: 'website',
        locale: 'en_IN',
    },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en-IN">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Tiro+Devanagari+Sanskrit&display=swap" rel="stylesheet" />
            </head>
            <body>{children}</body>
        </html>
    );
}
