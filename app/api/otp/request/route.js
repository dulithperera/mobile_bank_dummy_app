import { NextResponse } from 'next/server';
import { setChallenge } from '@/lib/db';
import { genOtp, genChallengeId } from '@/lib/utils';

const DEV_MODE = process.env.DEV_MODE_NO_SMS === 'true';

export async function POST(request) {
  const { phoneNumber, label } = await request.json();
  if (!phoneNumber) {
    return NextResponse.json({ error: 'phoneNumber required' }, { status: 400 });
  }

  const code = genOtp();
  const challengeId = genChallengeId();
  const requestedAt = Date.now();

  await setChallenge(challengeId, {
    phoneNumber, code, label,
    requestedAt,
    rerequestCount: 0,
    failedAttempts: 0,
  });

  if (DEV_MODE) {
    console.log(`\n[DEV MODE] OTP for ${phoneNumber}: ${code}\n`);
  } else {
    try {
      const twilio = (await import('twilio')).default;
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      await client.messages.create({
        body: `Your SecureBank verification code is ${code}. Do not share this with anyone.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber,
      });
    } catch (err) {
      console.error('Twilio send failed:', err.message);
      return NextResponse.json({ error: 'SMS send failed', detail: err.message }, { status: 500 });
    }
  }

  return NextResponse.json({ challengeId, requestedAt });
}