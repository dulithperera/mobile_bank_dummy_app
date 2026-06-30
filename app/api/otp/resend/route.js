import { NextResponse } from 'next/server';
import { getChallenge, updateChallenge } from '@/lib/db';
import { sendOtpSms } from '@/lib/sms';

const DEV_MODE = process.env.DEV_MODE_NO_SMS === 'true';

export async function POST(request) {
  const { challengeId } = await request.json();
  const challenge = await getChallenge(challengeId);
  if (!challenge) {
    return NextResponse.json({ error: 'challenge not found' }, { status: 404 });
  }

  const updated = await updateChallenge(challengeId, {
    rerequestCount: challenge.rerequestCount + 1,
  });

  if (DEV_MODE) {
    console.log(`\n[DEV MODE] Resent OTP for ${challenge.phoneNumber}: ${challenge.code}\n`);
  } else {
    try {
      await sendOtpSms(challenge.phoneNumber, `Your SecureBank verification code is ${challenge.code}. Do not share this with anyone.`);
    } catch (err) {
      return NextResponse.json({ error: 'SMS resend failed', detail: err.message }, { status: 500 });
    }
  }

  return NextResponse.json({ rerequestCount: updated.rerequestCount });
}