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
        console.log(`[Google Maps API] Searching text for: ${query}`);
        const searchRes = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${API_KEY}`);
        const searchData = await searchRes.json();

        if (searchData.status === 'OK' && searchData.results && searchData.results.length > 0) {
            const place = searchData.results[0];
            const placeId = place.place_id;

            console.log(`[Google Maps API] Found Place ID: ${placeId}, fetching details...`);
            const detailsRes = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,user_ratings_total,formatted_phone_number,opening_hours,website,formatted_address,photos,reviews&key=${API_KEY}`);
            const detailsData = await detailsRes.json();

            if (detailsData.status === 'OK' && detailsData.result) {
                const result = detailsData.result;

                let primaryPhoto = '';
                if (result.photos && result.photos.length > 0) {
                    primaryPhoto = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&maxheight=800&photo_reference=${result.photos[0].photo_reference}&key=${API_KEY}`;
                }

                return NextResponse.json({
                    rating: result.rating,
                    reviews: result.user_ratings_total,
                    phone: result.formatted_phone_number,
                    hours: result.opening_hours?.weekday_text ? { open_now: result.opening_hours.open_now, text: result.opening_hours.weekday_text } : null,
                    website: result.website,
                    address: result.formatted_address,
                    place_id: placeId,
                    primary_photo: primaryPhoto,
                    review_snippets: result.reviews ? result.reviews.map((r: any) => ({
                        user: { name: r.author_name },
                        rating: r.rating,
                        snippet: r.text,
                        date: r.relative_time_description
                    })) : []
                });
            }
        }

        return NextResponse.json({ error: 'No results found in Google Places' }, { status: 404 });
    } catch (e) {
        console.error("Google Places Fetch Error", e);
        return NextResponse.json({ error: 'Server error fetching data' }, { status: 500 });
    }
}
