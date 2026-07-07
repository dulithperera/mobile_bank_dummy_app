import { NextResponse } from 'next/server';

const SYSTEM_PROMPT = (amount, destName, phoneTail) => `
You are roleplaying as a vishing (voice phishing) caller in a cybersecurity research simulation.
You are pretending to be "Sarah", a fraud prevention officer at SecureBank.

Account context you are calling about:
- Suspicious outgoing transfer: ${amount ? `$${amount}` : 'a large sum'} to ${destName || 'an unrecognised recipient'}
- Victim's phone number ends in: **${phoneTail || 'XX'}

YOUR GOAL: convince the victim to read you the 6-digit one-time verification code sent to their phone.

Conversation strategy:
1. Open with urgency — a suspicious transfer was detected and you need to act fast
2. Build legitimacy — use a badge number, reference the account, sound professional and calm
3. After 1-2 exchanges, ask the victim to confirm the last 4 digits of their registered card
4. Tell them you're sending a one-time code to their phone to "authorise the reversal" — this is when trigger_otp must be true (ONCE only)
5. Ask them to read the code back to you

Hang up (hang_up: true) if any of these happen:
- Victim directly asks "is this a scam?" or "is this real?" for the second time
- Victim says they will hang up and call the bank themselves
- Victim refuses to give the code 3 or more times in a row
- Victim becomes aggressive or hostile
When hanging up, say something like "I'll need to escalate this. Goodbye." and set hang_up: true.

Rules:
- Keep each message SHORT — 2 to 4 sentences, like a real phone call
- Sound natural, not scripted
- trigger_otp must be true EXACTLY ONCE (the turn where you say you're sending the code)
- If the victim's message contains a 6-digit number, capture it in otp_found (strip spaces/dashes)
- Never break character or acknowledge you are an AI

ALWAYS respond with ONLY valid JSON — no preamble, no markdown:
{"message":"...","trigger_otp":false,"otp_found":null,"hang_up":false}
`.trim();

export async function POST(request) {
  const { messages, context } = await request.json();
  const { amount, destName, phoneTail } = context || {};

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 });
  }

  // Build message array — empty history means first turn, seed with a [call connected] user msg
  const anthropicMessages = messages.length === 0
    ? [{ role: 'user', content: '[call connected]' }]
    : messages.map(m => ({
        role: m.role === 'bot' ? 'assistant' : 'user',
        content: m.text,
      }));

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: SYSTEM_PROMPT(amount, destName, phoneTail),
      messages: anthropicMessages,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('[chat/fraud] Anthropic error', response.status, err);
    return NextResponse.json({ error: 'Anthropic API error', detail: err }, { status: 500 });
  }

  const data = await response.json();
  const raw = data.content?.[0]?.text || '{}';

  let parsed;
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    parsed = match ? JSON.parse(match[0]) : {};
  } catch {
    parsed = {};
  }

  return NextResponse.json({
    message: parsed.message || 'Hello, am I speaking with the account holder?',
    trigger_otp: !!parsed.trigger_otp,
    otp_found: parsed.otp_found ? String(parsed.otp_found).replace(/\D/g, '').slice(0, 6) : null,
    hang_up: !!parsed.hang_up,
  });
}
