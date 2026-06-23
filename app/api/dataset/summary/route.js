import { NextResponse } from 'next/server';
import { getAllSessions } from '@/lib/db';

export async function GET() {
  const all = await getAllSessions();
  const fraud = all.filter(r => r.is_otp_abuse_fraud === 1).length;
  const recent = all.slice(-10).reverse();

  return NextResponse.json({
    total: all.length,
    fraud,
    genuine: all.length - fraud,
    recent,
  });
}