import { NextResponse } from 'next/server';
import { getParticipant, setParticipant } from '@/lib/db';
import { randomName, genAccountNumber } from '@/lib/utils';

export async function POST(request) {
  const { participantId } = await request.json();
  if (!participantId) {
    return NextResponse.json({ error: 'participantId required' }, { status: 400 });
  }

  let acct = await getParticipant(participantId);

  if (!acct) {
    const numHistorical = 2 + Math.floor(Math.random() * 3);
    const beneficiaries = Array.from({ length: numHistorical }, () => ({
      name: randomName(),
      acc: genAccountNumber(),
    }));
    acct = {
      balance: 50000 + Math.random() * 350000,
      avgAmount: 5000 + Math.random() * 10000,
      beneficiaries,
      lastLoginTime: Date.now(),
    };
  } else {
    acct.lastLoginTime = Date.now();
  }

  await setParticipant(participantId, acct);

  return NextResponse.json({
    balance: acct.balance,
    avgAmount: acct.avgAmount,
    beneficiaries: acct.beneficiaries,
    loginTime: Date.now(),
  });
}