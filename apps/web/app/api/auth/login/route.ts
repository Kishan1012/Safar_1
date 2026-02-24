import { NextRequest, NextResponse } from 'next/server';

const AUTH_SERVICE = process.env.AUTH_SERVICE_URL ?? 'http://localhost:3003';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const res = await fetch(`${AUTH_SERVICE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        const data = await res.json();
        const response = NextResponse.json(data, { status: res.status });

        // Forward the HttpOnly session cookie from auth-service to the browser
        const setCookie = res.headers.get('set-cookie');
        if (setCookie) response.headers.set('set-cookie', setCookie);

        return response;
    } catch {
        return NextResponse.json({ error: 'Auth service unavailable' }, { status: 503 });
    }
}
