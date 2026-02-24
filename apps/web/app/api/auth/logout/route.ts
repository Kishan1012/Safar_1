import { NextResponse } from 'next/server';

const AUTH_SERVICE = process.env.AUTH_SERVICE_URL ?? 'http://localhost:3003';

export async function POST() {
    try {
        await fetch(`${AUTH_SERVICE}/auth/logout`, { method: 'POST' });
    } catch { /* best-effort */ }

    // Clear the session cookie on the browser side regardless
    const response = NextResponse.json({ data: { message: 'Logged out' } });
    response.cookies.delete('safar_session');
    return response;
}
