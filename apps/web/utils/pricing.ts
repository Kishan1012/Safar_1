/**
 * Utility to generate realistic estimated prices for Indian travel 
 * when the LLM returns "Free" or null for non-free activities.
 */
export const estimatePricing = (title: string, type: string, currentCost: string | undefined): string => {
    // If the LLM already gave a clear numeric cost, or it's genuinely a free place (like a park/ghat), keep it
    if (currentCost && currentCost.toLowerCase() !== 'free' && /\d/.test(currentCost)) {
        return currentCost;
    }

    const text = (title + " " + type).toLowerCase();

    // Activities that are almost always genuinely free in India
    if (
        text.includes('ghat') ||
        text.includes('walk') ||
        text.includes('beach') ||
        text.includes('street') ||
        text.includes('market') ||
        text.includes('bazaar') ||
        (text.includes('temple') && !text.includes('vip'))
    ) {
        return "Free";
    }

    // Heritage / Monuments / Forts (Standard ASI entry fees are usually ₹40-₹100 for Indians)
    if (text.includes('fort') || text.includes('palace') || text.includes('mahal') || text.includes('monument') || text.includes('museum')) {
        return "Est: ₹50 - ₹200";
    }

    // Adventure / Paid Tours
    if (text.includes('safari') || text.includes('paragliding') || text.includes('scuba') || text.includes('boat') || text.includes('cruise')) {
        return "Est: ₹1,500 - ₹3,500";
    }

    // Food & Dining
    if (text.includes('lunch') || text.includes('dinner') || text.includes('restaurant') || text.includes('cafe')) {
        return "Est: ₹800 - ₹2,000 for two";
    }

    // Default fallback for generic activities that aren't free
    return "Est: ₹500";
};
