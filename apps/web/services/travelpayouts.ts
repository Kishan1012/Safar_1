'use server';

const TOKEN = process.env.TRAVELPAYOUTS_API_KEY;
const MARKER = '705363';

export interface HotelDeal {
    id: string;
    title: string;
    price: number;
    currency: string;
    img: string;
    affiliateUrl: string;
}

// Map frontend names to IATA codes or City IDs (Travelpayouts often uses IATA for cities)
// Goa (GOI), Lonavala (nearest PNQ), Munnar (nearest COK)
// For hotels API, we need city IDs or we can search by IATA.
// Travelpayouts hotel API: http://engine.hotellook.com/api/v2/cache.json
// location: IATA or city name

const DESTINATIONS = [
    { id: 'goa', name: 'Goa', location: 'GOI', img: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?q=80&w=800' },
    { id: 'lonavala', name: 'Lonavala', location: 'PNQ', img: 'https://images.unsplash.com/photo-1625505826533-5c80aca7d157?q=80&w=800' },
    { id: 'munnar', name: 'Munnar', location: 'COK', img: 'https://images.unsplash.com/photo-1593693397690-362cb9666cf2?q=80&w=800' },
];

export async function getLiveHotelDeals(): Promise<HotelDeal[]> {
    if (!TOKEN) {
        console.warn("No TRAVELPAYOUTS_API_KEY found. Returning fallback data.");
        return getFallbackDeals();
    }

    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const checkIn = `${year}-${month}-10`;
    const checkOut = `${year}-${month}-15`;

    const deals: HotelDeal[] = [];

    for (const dest of DESTINATIONS) {
        try {
            // Using Hotellook cache API for simple prices
            const url = `http://engine.hotellook.com/api/v2/cache.json?location=${dest.location}&checkIn=${checkIn}&checkOut=${checkOut}&currency=inr&limit=1&token=${TOKEN}`;
            const res = await fetch(url, { next: { revalidate: 3600 } });

            if (!res.ok) {
                console.error(`Failed to fetch for ${dest.name}: ${res.status}`);
                deals.push(createFallbackDeal(dest));
                continue;
            }

            const data = await res.json();

            if (data && data.length > 0) {
                const hotel = data[0];
                const pricePerNight = Math.round(hotel.priceAvg || (hotel.priceFrom));

                deals.push({
                    id: dest.id,
                    title: `4-Star Stay in ${dest.name}`,
                    price: pricePerNight,
                    currency: '₹',
                    img: dest.img,
                    // Deep link to hotellook with our marker
                    affiliateUrl: `https://search.hotellook.com/hotels?destination=${dest.name}&checkIn=${checkIn}&checkOut=${checkOut}&marker=${MARKER}&currency=inr`
                });
            } else {
                deals.push(createFallbackDeal(dest));
            }

        } catch (error) {
            console.error(`Error fetching for ${dest.name}:`, error);
            deals.push(createFallbackDeal(dest));
        }
    }

    return deals;
}

function createFallbackDeal(dest: typeof DESTINATIONS[0]): HotelDeal {
    const fallbackPrices: Record<string, number> = {
        'goa': 4500,
        'lonavala': 6200,
        'munnar': 5100
    };

    return {
        id: dest.id,
        title: `4-Star Stay in ${dest.name}`,
        price: fallbackPrices[dest.id] || 5000,
        currency: '₹',
        img: dest.img,
        affiliateUrl: `https://search.hotellook.com/hotels?destination=${dest.name}&marker=${MARKER}&currency=inr`
    };
}

function getFallbackDeals(): HotelDeal[] {
    return DESTINATIONS.map(dest => createFallbackDeal(dest));
}

export interface FlightDeal {
    airline: string;
    price: number;
    currency: string;
    departure_at: string;
    link: string;
}

const IATA_MAP: Record<string, string> = {
    'mumbai': 'BOM',
    'delhi': 'DEL',
    'new york': 'JFK',
    'goa': 'GOI',
    'bangalore': 'BLR',
    'chennai': 'MAA',
    'kolkata': 'CCU',
    'hyderabad': 'HYD',
    'jaipur': 'JAI',
    'varanasi': 'VNS',
    'kochi': 'COK',
    'pune': 'PNQ',
    'agra': 'AGR',
    'udaipur': 'UDR',
    'rishikesh': 'DED', // Dehradun is nearest
    'ladakh': 'IXL', // Leh
};

function getIataCode(city: string): string {
    if (!city) return 'DEL';
    const clean = city.toLowerCase();
    for (const key in IATA_MAP) {
        if (clean.includes(key)) return IATA_MAP[key];
    }
    return 'DEL'; // default fallback
}

export async function getLiveFlights(originCity: string, destinationCity: string, dateStr?: string): Promise<FlightDeal | null> {
    if (!TOKEN) return null;

    const origin = getIataCode(originCity);
    const destination = getIataCode(destinationCity);

    let departDate = dateStr;
    if (!departDate) {
        const d = new Date();
        d.setMonth(d.getMonth() + 1);
        departDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    } else {
        // Aviasales cheap prices API expects YYYY-MM
        departDate = departDate.substring(0, 7);
    }

    const url = `http://api.travelpayouts.com/v1/prices/cheap?origin=${origin}&destination=${destination}&depart_date=${departDate}&currency=INR&token=${TOKEN}`;

    try {
        const res = await fetch(url, { next: { revalidate: 3600 } });
        if (!res.ok) return null;
        const data = await res.json();

        if (data.success && data.data[destination]) {
            const flights = data.data[destination];
            const keys = Object.keys(flights);
            if (keys.length > 0) {
                const flight = flights[keys[0]]; // get first/cheapest

                // Map airline code loosely or just show it
                let airlineName = flight.airline;
                if (airlineName === 'AI') airlineName = 'Air India';
                if (airlineName === '6E') airlineName = 'IndiGo';
                if (airlineName === 'UK') airlineName = 'Vistara';
                if (airlineName === 'SG') airlineName = 'SpiceJet';
                if (airlineName === 'QP') airlineName = 'Akasa Air';

                return {
                    airline: airlineName,
                    price: flight.price,
                    currency: '₹',
                    departure_at: flight.departure_at,
                    link: `https://search.aviasales.com/flights?origin=${origin}&destination=${destination}&marker=${MARKER}`
                };
            }
        }
    } catch (e) {
        console.error("Flight fetch error:", e);
    }
    return null;
}

export interface WayAwayFlight {
    id: string;
    airline: string;
    airlineLogo: string;
    type: 'Cheapest' | 'Recommended' | 'Fastest';
    price: number;
    currency: string;
    departure_time: string;
    arrival_time: string;
    duration: string;
    link: string;
}

export async function getWayAwayFlights(originCity: string, destinationCity: string, dateStr?: string): Promise<WayAwayFlight[]> {
    const origin = getIataCode(originCity);
    const destination = getIataCode(destinationCity);

    let basePrice = 4500;
    try {
        const live = await getLiveFlights(originCity, destinationCity, dateStr);
        if (live && live.price) {
            basePrice = live.price;
        }
    } catch { }

    const baseUrl = `https://wayaway.io/flights/${origin}-${destination}?marker=${MARKER}`;

    return [
        {
            id: 'flight_cheap',
            airline: 'IndiGo',
            airlineLogo: 'https://images.kiwi.com/airlines/64/6E.png',
            type: 'Cheapest',
            price: basePrice,
            currency: '₹',
            departure_time: '06:00 AM',
            arrival_time: '08:30 AM',
            duration: '2h 30m',
            link: baseUrl
        },
        {
            id: 'flight_rec',
            airline: 'Vistara',
            airlineLogo: 'https://images.kiwi.com/airlines/64/UK.png',
            type: 'Recommended',
            price: Math.round(basePrice * 1.3),
            currency: '₹',
            departure_time: '10:15 AM',
            arrival_time: '12:45 PM',
            duration: '2h 30m',
            link: baseUrl
        },
        {
            id: 'flight_fast',
            airline: 'Air India',
            airlineLogo: 'https://images.kiwi.com/airlines/64/AI.png',
            type: 'Fastest',
            price: Math.round(basePrice * 1.6),
            currency: '₹',
            departure_time: '05:45 PM',
            arrival_time: '07:55 PM',
            duration: '2h 10m',
            link: baseUrl
        }
    ];
}

export async function getFlashDeal(destinationCity: string, checkInDate?: string, checkOutDate?: string): Promise<HotelDeal | null> {
    if (!TOKEN || !destinationCity) return null;

    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    const defaultCheckIn = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-10`;
    const defaultCheckOut = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-15`;

    const checkIn = checkInDate || defaultCheckIn;
    const checkOut = checkOutDate || defaultCheckOut;
    // Map destination name to its IATA code
    const location = getIataCode(destinationCity);

    try {
        const url = `http://engine.hotellook.com/api/v2/cache.json?location=${location}&checkIn=${checkIn}&checkOut=${checkOut}&currency=inr&limit=1&token=${TOKEN}`;
        const res = await fetch(url, { next: { revalidate: 3600 } });

        if (!res.ok) {
            console.error(`Failed to fetch flash deal for ${destinationCity}: ${res.status}`);
            return null;
        }

        const data = await res.json();

        if (data && data.length > 0) {
            const hotel = data[0];
            const pricePerNight = Math.round(hotel.priceAvg || hotel.priceFrom);

            // Fetch a generic image based on city
            const img = `https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?q=80&w=800`; // Could be more dynamic

            return {
                id: `flash_deal_${location}`,
                title: `Premium Stay in ${destinationCity}`,
                price: pricePerNight,
                currency: '₹',
                img: img,
                affiliateUrl: `https://search.hotellook.com/hotels?destination=${destinationCity}&checkIn=${checkIn}&checkOut=${checkOut}&marker=${MARKER}&currency=inr`
            };
        }
    } catch (error) {
        console.error(`Error fetching flash deal for ${destinationCity}:`, error);
    }

    return null;
}
