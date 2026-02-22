"use client";

const CACHE = new Map<string, string>();

export const fetchUnsplashImage = async (query: string, orientation: 'landscape' | 'portrait' | 'squarish' = 'landscape'): Promise<string> => {
    const cacheKey = `${query}-${orientation}`;
    if (CACHE.has(cacheKey)) return CACHE.get(cacheKey)!;

    try {
        const apiKey = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;
        if (!apiKey) {
            console.warn("Unsplash API key is missing. Using fallback.");
            return getFallbackImage(query);
        }

        const res = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&client_id=${apiKey}&per_page=1&orientation=${orientation}`);
        const data = await res.json();

        if (data.results && data.results.length > 0) {
            const url = data.results[0].urls.regular;
            CACHE.set(cacheKey, url);
            return url;
        }
    } catch (e) {
        console.error("Unsplash error fetching:", query, e);
    }

    // Hard fallback if rate limited or not found
    return getFallbackImage(query);
};

const getFallbackImage = (query: string) => {
    const text = query.toLowerCase();
    if (text.includes('beach') || text.includes('sea')) return "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?q=80&w=1200&auto=format&fit=crop";
    if (text.includes('city')) return "https://images.unsplash.com/photo-1506461883276-594540eb36cb?q=80&w=1200&auto=format&fit=crop";
    if (text.includes('food') || text.includes('restaurant')) return "https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=1200&auto=format&fit=crop";
    return "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=1200&auto=format&fit=crop";
};
