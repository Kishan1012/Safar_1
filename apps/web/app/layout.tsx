import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'Romy — AI Travel Planning',
    description: 'Turn your saved social media posts into real, optimized travel itineraries.',
    keywords: ['travel planning', 'AI travel', 'itinerary generator', 'trip planner'],
    openGraph: {
        title: 'Romy — AI Travel Planning',
        description: 'Turn your saved social media posts into real, optimized travel itineraries.',
        type: 'website',
    },
};

import Navbar from '../components/Navbar';
import AuthModal from '../components/AuthModal';

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>
                <Navbar />
                <AuthModal />
                <main>{children}</main>
            </body>
        </html>
    );
}
