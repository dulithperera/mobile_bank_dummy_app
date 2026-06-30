import { NextResponse } from 'next/server';
import { setChallenge } from '@/lib/db';
import { genOtp, genChallengeId } from '@/lib/utils';
import { sendOtpSms } from '@/lib/sms';

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
      await sendOtpSms(phoneNumber, `Your SecureBank verification code is ${code}. Do not share this with anyone.`);
    } catch (err) {
      console.error('SMS send failed:', err.message);
      return NextResponse.json({ error: 'SMS send failed', detail: err.message }, { status: 500 });
    }
  }

  return NextResponse.json({ challengeId, requestedAt });
}