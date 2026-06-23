import { NextResponse } from 'next/server';
import { getChallenge, updateChallenge } from '@/lib/db';

export async function POST(request) {
  const { challengeId, enteredCode } = await request.json();
  const challenge = await getChallenge(challengeId);
  if (!challenge) {
    return NextResponse.json({ error: 'challenge not found' }, { status: 404 });
  }

  if (enteredCode !== challenge.code) {
    await updateChallenge(challengeId, { failedAttempts: challenge.failedAttempts + 1 });
    return NextResponse.json({ success: false, failedAttempts: challenge.failedAttempts + 1 });
  }

  const responseTimeSeconds = (Date.now() - challenge.requestedAt) / 1000;

  return NextResponse.json({
    success: true,
    otpResponseTime: +responseTimeSeconds.toFixed(1),
    otpRerequestCount: challenge.rerequestCount,
    failedOtpAttempts: challenge.failedAttempts,
    callInProgressFlag: challenge.label,
  });
}