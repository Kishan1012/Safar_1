export const AFFILIATE_ID = '705363';

export interface AffiliateCTA {
    url: string;
    label: string;
    glow: boolean;
    urgencyTag?: string; // e.g. "🔥 High Demand"
}

export const generateAffiliateLink = (title: string, type: string, destination: string): AffiliateCTA => {
    const text = (title + " " + type).toLowerCase();

    let baseUrl = '';
    let label = 'Book Now';
    let glow = false;
    let urgencyTag: string | undefined = undefined;

    const isStay = text.includes('stay') || text.includes('hotel') || text.includes('resort') || text.includes('accommodation');
    const isActivity = text.includes('activity') || text.includes('tour') || text.includes('sightseeing') || text.includes('walk') || text.includes('ride') || text.includes('explore');
    const isTransit = text.includes('transit') || text.includes('flight') || text.includes('cab');

    if (isStay) {
        // Hotellook / Booking.com / Agoda search via Travelpayouts
        const query = encodeURIComponent(title + " " + destination);
        baseUrl = `https://search.hotellook.com/hotels?destination=${query}`;
        label = 'Check Availability';
        glow = text.includes('luxury') || text.includes('resort') || text.includes('top rated') || text.includes('5 star');

        if (glow) urgencyTag = "💎 Top Rated";
        else if (text.includes('popular')) urgencyTag = "🔥 High Demand";
        else urgencyTag = "✨ Great Value";

    } else if (isActivity) {
        // GetYourGuide / Viator search
        const query = encodeURIComponent(title + " " + destination);
        baseUrl = `https://www.getyourguide.com/search?q=${query}`;
        label = 'Get Tickets';
        glow = text.includes('exclusive') || text.includes('popular') || text.includes('must do');

        if (glow) urgencyTag = "🔥 Best Seller";
        else if (text.includes('guide')) urgencyTag = "👤 Guided Tour";
    } else if (isTransit) {
        // Aviasales / Flights
        const query = encodeURIComponent(destination);
        baseUrl = `https://search.aviasales.com/flights?destination=${query}`;
        label = 'Search Options';
        urgencyTag = "✈️ Fastest Route";
    } else {
        // Generic fallback
        const query = encodeURIComponent(title + " " + destination);
        baseUrl = `https://www.tripadvisor.com/Search?q=${query}`;
        label = 'Explore Options';
    }

    // Construct TravelPayouts Deep Link format
    // https://tp.media/r?marker=ID&u={encoded_url}
    const finalUrl = `https://tp.media/r?marker=${AFFILIATE_ID}&u=${encodeURIComponent(baseUrl)}`;

    return { url: finalUrl, label, glow, urgencyTag };
};
