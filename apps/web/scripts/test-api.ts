import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const TOKEN = process.env.TRAVELPAYOUTS_API_KEY;

if (!TOKEN) {
    console.error("❌ Missing TRAVELPAYOUTS_API_KEY in .env.local");
    process.exit(1);
}

async function testApi() {
    console.log("✈️  Initiating Phase 1: Travelpayouts API Handshake...");

    // Flight from Mumbai (BOM) to Delhi (DEL) for next month
    const origin = 'BOM';
    const destination = 'DEL';

    // Calculate next month dynamically
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const departDate = `${year}-${month}`;

    const url = `http://api.travelpayouts.com/v1/prices/cheap?origin=${origin}&destination=${destination}&depart_date=${departDate}&currency=INR&token=${TOKEN}`;

    console.log(`\n📡 Fetching cheapest flights from ${origin} to ${destination} for ${departDate}...`);

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (response.ok && data.success) {
            console.log("\n✅ Success! Connected to Aviasales Data API");
            console.log("==================================================");
            console.log("Prices returned in ₹ (INR):");

            // Log the flights
            const flights = data.data[destination];
            if (flights && Object.keys(flights).length > 0) {
                // Let's just print a couple of options
                let count = 0;
                for (const ticketId in flights) {
                    if (count >= 3) break;
                    const flight = flights[ticketId];
                    console.log(`- Flight via ${flight.airline}: ₹${flight.price} (Depart: ${new Date(flight.departure_at).toISOString().split('T')[0]})`);
                    count++;
                }
                console.log("==================================================");
                console.log("Phase 1 complete. Ready for Phase 2! 🚀");
            } else {
                console.log("⚠️ API connected, but no flights found for these dates. Perhaps change the dates?");
            }
        } else {
            console.error("\n❌ API Request Failed:", data);
        }
    } catch (e) {
        console.error("\n❌ Error connecting to API:", e);
    }
}

testApi();
