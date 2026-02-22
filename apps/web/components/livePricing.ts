// Mock service simulating live API fetching for Agoda, GetYourGuide, etc.

export interface LiveDeal {
    priceINR: number;
    provider: string;
    rating: number;
    badge?: string;
    isAvailable: boolean;
}

export const fetchLivePricing = (title: string, type: string, destination: string): LiveDeal => {
    const text = (title + " " + type).toLowerCase();

    // Simulate API delay/latency? (In a real app, this would be an async fetch)
    // For synchronous rendering in this demo, we just generate mock data immediately.

    // Base deterministic pseudo-random logic based on text length to keep it consistent per item
    const hash = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    const isStay = text.includes('stay') || text.includes('hotel') || text.includes('resort') || text.includes('accommodation');
    const isActivity = text.includes('activity') || text.includes('tour') || text.includes('sightseeing') || text.includes('walk') || text.includes('ride') || text.includes('explore');

    let price = 500 + (hash % 1500); // Default base
    let provider = 'TripAdvisor';
    let rating = 4.0 + ((hash % 10) / 10); // 4.0 - 4.9
    let badge = undefined;

    if (isStay) {
        price = 2500 + (hash % 8000); // 2.5k to 10.5k INR
        provider = 'Agoda'; // South Asia focus
        if (price < 4000) badge = `Best Value in ${destination}`;
        else if (rating >= 4.7) badge = `Top Rated Resort`;
    } else if (isActivity) {
        provider = hash % 2 === 0 ? 'Viator' : 'GetYourGuide';

        if (text.includes('free') || text.includes('ghat') || text.includes('park')) {
            price = 0;
            provider = 'Local Guide';
        } else if (text.includes('safari') || text.includes('scuba') || text.includes('paragliding')) {
            price = 2000 + (hash % 3000); // 2k to 5k INR
            badge = "🔥 High Demand";
        } else {
            price = 200 + (hash % 1000); // 200 to 1200 INR
        }

        if (rating >= 4.8) badge = "✨ Popular Choice";
    }

    return {
        priceINR: price,
        provider,
        rating: Number(rating.toFixed(1)),
        badge,
        isAvailable: true
    };
};

export const formatINR = (amount: number): string => {
    if (amount === 0) return "Free";
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount);
};
