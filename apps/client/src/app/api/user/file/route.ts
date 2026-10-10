import { NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest) {
  return new NextResponse(JSON.stringify({ message: 'Not implemented' }), {
    status: 501,
    headers: { 'Content-Type': 'application/json' },
  });
}
