import { NextResponse } from 'next/server';
import { getCurrentMode, setCurrentMode } from '@/lib/db';

export async function GET() {
  const mode = await getCurrentMode();
  return NextResponse.json({ mode });
}

export async function POST(request) {
  const { mode } = await request.json();
  if (mode !== 'genuine' && mode !== 'fraud') {
    return NextResponse.json({ error: "mode must be 'genuine' or 'fraud'" }, { status: 400 });
  }
  await setCurrentMode(mode);
  return NextResponse.json({ mode });
}