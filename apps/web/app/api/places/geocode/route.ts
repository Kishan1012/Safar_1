import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');

    if (!query) {
        return NextResponse.json({ error: 'Query is missing' }, { status: 400 });
    }

    const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!API_KEY) {
        return NextResponse.json({ error: 'Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY' }, { status: 500 });
    }

    try {
        console.log(`[Google Geocoding API] Resolving coordinates for: ${query}`);
        const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${API_KEY}`);
        const data = await res.json();

        if (data.status === 'OK' && data.results && data.results.length > 0) {
            const loc = data.results[0].geometry.location;
            return NextResponse.json({
                lat: loc.lat,
                lng: loc.lng
            });
        }

        return NextResponse.json({ error: 'No results found' }, { status: 404 });
    } catch (e) {
        console.error("Geocoding API Fetch Error", e);
        return NextResponse.json({ error: 'Server error fetching geocode' }, { status: 500 });
    }
}
