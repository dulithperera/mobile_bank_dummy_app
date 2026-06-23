import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ ok: true, devMode: process.env.DEV_MODE_NO_SMS === 'true' });
}