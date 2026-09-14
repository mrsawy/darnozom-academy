import { NextRequest, NextResponse } from 'next/server';
import { getPublicApiUrl } from '@/lib/data/constants/api-url.constants';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await fetch(`${getPublicApiUrl()}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ message: 'Request failed' }, { status: 500 });
  }
}
