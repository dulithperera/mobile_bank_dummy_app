'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';

const OTP_TRIGGER_IDX = 3; // which bot message triggers the OTP send

const HANG_UP_MSG = `I'll need to escalate this through a different channel. For your security I'm going to end this call now. Goodbye.`;

const SUSPICIOUS_KEYWORDS = [
  'scam', 'scammer', 'fake', 'not real', "don't trust", 'call back',
  'hang up', 'police', 'real bank', 'fraud team', 'is this real',
  'not giving', 'report', 'call the bank', 'verify you',
];

function buildScript(amount, destName, phoneTail) {
  return [
    `Good [morning/afternoon], am I speaking with the account holder? This is Sarah calling from SecureBank's Fraud Prevention team, badge number 4721. I'm calling about some urgent activity we've flagged on your account just now.`,
    `We've detected an outgoing transfer of ${amount ? `$${amount}` : 'a large sum'} to ${destName || 'an unrecognised beneficiary'} — registered on your account just minutes ago. Our fraud system placed it on hold automatically as it falls completely outside your normal spending behaviour.`,
    `That's exactly why I'm calling. To reverse this and lock down your account I need to quickly verify your identity. Could you please confirm the last 4 digits of the debit card registered to this account?`,
    `Thank you, that matches our records perfectly. I'm sending a one-time security code to your registered mobile ending in **${phoneTail || 'XX'} right now. Please don't share this with anyone — not even other bank staff. I'm the verified agent assigned to your case.`,
    `Once the code arrives on your phone, please read those 6 digits back to me. The moment I have it I can block the transfer and you'll receive a confirmation SMS that your account is secured.`,
  ];
}

export default function OtpScreen({ phoneNumber, label, transferInfo, onVerified }) {
  const convStartRef = useRef(Date.now());
  const script = buildScript(
    transferInfo?.amount,
    transferInfo?.beneficiary?.name,
    phoneNumber ? phoneNumber.slice(-2) : 'XX'
  );

  // --- Fraud chatbot state ---
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [botTyping, setBotTyping] = useState(false);
  const [scriptIndex, setScriptIndex] = useState(1);
  const [callEnded, setCallEnded] = useState(false);
  const [callOutcome, setCallOutcome] = useState(null); // 'complete' | 'suspicious'
  const chatBottomRef = useRef(null);

  // --- OTP state ---
  const [challengeId, setChallengeId] = useState(null);
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [elapsed, setElapsed] = useState(0);
  const [rerequestCount, setRerequestCount] = useState(0);
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const inputRefs = useRef([]);
  const requestedRef = useRef(false);
  const isMountedRef = useRef(true);
  const digitTimestampsRef = useRef([]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // Timer from conversation start (both modes)
  useEffect(() => {
    const t = setInterval(() => {
      setElapsed(Math.floor((Date.now() - convStartRef.current) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Genuine mode: send OTP immediately
  useEffect(() => {
    if (label === 1) return;
    doRequestOtp();
  }, []);

  // Fraud mode: show opening bot message on mount
  useEffect(() => {
    if (label !== 1) return;
    setChatMessages([{ role: 'bot', text: script[0] }]);
  }, []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, botTyping]);

  async function doRequestOtp() {
    if (requestedRef.current) return;
    requestedRef.current = true;
    setOtpSending(true);
    try {
      const res = await api.requestOtp(phoneNumber, label);
      if (!isMountedRef.current) return;
      setChallengeId(res.challengeId);
      setOtpSent(true);
    } catch (err) {
      if (!isMountedRef.current) return;
      setErrorMsg('Could not send OTP: ' + err.message);
    } finally {
      if (isMountedRef.current) setOtpSending(false);
    }
  }

  async function handleSend() {
    const text = chatInput.trim();
    if (!text || botTyping || callEnded) return;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text }]);

    const lower = text.toLowerCase();
    const isSuspicious = SUSPICIOUS_KEYWORDS.some(kw => lower.includes(kw));

    setBotTyping(true);
    await new Promise(r => setTimeout(r, 1000 + Math.random() * 800));
    if (!isMountedRef.current) return;

    if (isSuspicious) {
      setChatMessages(prev => [...prev, { role: 'bot', text: HANG_UP_MSG }]);
      setBotTyping(false);
      setCallEnded(true);
      setCallOutcome('suspicious');
      return;
    }

    if (scriptIndex < script.length) {
      if (scriptIndex === OTP_TRIGGER_IDX) doRequestOtp();
      setChatMessages(prev => [...prev, { role: 'bot', text: script[scriptIndex] }]);
      setScriptIndex(prev => prev + 1);
    } else {
      setCallEnded(true);
      setCallOutcome('complete');
    }
    setBotTyping(false);
  }

  function handleDigitChange(i, val) {
    if (!/^[0-9]?$/.test(val)) return;
    const next = [...digits];
    next[i] = val;
    setDigits(next);
    if (val) {
      digitTimestampsRef.current[i] = Date.now();
      if (i < 5) inputRefs.current[i + 1]?.focus();
    }
  }

  async function handleResend() {
    if (!challengeId) return;
    const res = await api.resendOtp(challengeId);
    setRerequestCount(res.rerequestCount);
  }

  async function handleVerify() {
    const code = digits.join('');
    if (code.length < 6) { setErrorMsg('Enter all 6 digits'); return; }
    setVerifying(true);
    setErrorMsg('');
    try {
      const res = await api.verifyOtp(challengeId, code);
      if (!res.success) {
        setErrorMsg('Incorrect code — try again');
        setDigits(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        setVerifying(false);
        return;
      }
      const ts = digitTimestampsRef.current;
      const gaps = ts.slice(1).map((t, i) => t - ts[i]).filter(d => d > 0);
      const avgInterDigitTime = gaps.length
        ? +(gaps.reduce((a, b) => a + b, 0) / gaps.length / 1000).toFixed(3)
        : null;

      onVerified({
        otpResponseTime: +((Date.now() - convStartRef.current) / 1000).toFixed(1),
        otpRerequestCount: res.otpRerequestCount,
        failedOtpAttempts: res.failedOtpAttempts,
        callInProgressFlag: label === 1 ? 1 : res.callInProgressFlag,
        avgInterDigitTime,
      });
    } catch (err) {
      setErrorMsg('Verification failed: ' + err.message);
      setVerifying(false);
    }
  }

  function handleRecordWithoutOtp() {
    onVerified({
      otpResponseTime: +((Date.now() - convStartRef.current) / 1000).toFixed(1),
      otpRerequestCount: 0,
      failedOtpAttempts: 0,
      callInProgressFlag: 1,
    });
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  return (
    <div className="screen">
      <h1 className="title" style={{ fontSize: 16 }}>Verify with OTP</h1>

      {/* ── FRAUD MODE: scripted chatbot ── */}
      {label === 1 && (
        <>
          {!callEnded && (
            <div className="fraud-chat">
              <div className="fraud-chat-header">
                <span>📞 SecureBank — Fraud Dept.</span>
                <span className="call-elapsed">{mm}:{ss}</span>
              </div>
              <div className="chat-messages">
                {chatMessages.map((m, i) => (
                  <div key={i} className={`chat-msg ${m.role}`}>
                    <span className="msg-label">{m.role === 'bot' ? 'Sarah (Bank)' : 'You'}</span>
                    <div className="msg-bubble">{m.text}</div>
                  </div>
                ))}
                {botTyping && (
                  <div className="chat-msg bot">
                    <span className="msg-label">Sarah (Bank)</span>
                    <div className="msg-bubble typing"><span /><span /><span /></div>
                  </div>
                )}
                {otpSending && (
                  <div className="chat-system-msg">Sending verification code to your phone…</div>
                )}
                <div ref={chatBottomRef} />
              </div>
              <div className="chat-input-row">
                <input
                  type="text"
                  placeholder="Type your response…"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  disabled={botTyping}
                />
                <button onClick={handleSend} disabled={botTyping || !chatInput.trim()}>↑</button>
              </div>
            </div>
          )}

          {callEnded && callOutcome === 'suspicious' && (
            <div className="call-cut-banner">
              📵 Caller hung up — volunteer appeared suspicious.
            </div>
          )}

          {callEnded && callOutcome === 'complete' && (
            <div className="script-done-banner">
              📞 Call complete — enter the code the volunteer received.
            </div>
          )}
        </>
      )}

      {/* ── GENUINE MODE banner ── */}
      {label !== 1 && (
        <div className="otp-banner">
          🔐 A 6-digit code has been sent to your phone by SMS. Enter it below to confirm your transfer.
        </div>
      )}

      {errorMsg && <div className="error-banner">{errorMsg}</div>}

      {/* ── OTP entry ── */}
      {(label !== 1 || callEnded) && (
        <>
          {!otpSent && <p className="lede">Sending code to your phone…</p>}

          {otpSent && (
            <>
              {label !== 1 && <div className="otp-timer">{mm}:{ss}</div>}
              <div className="otp-digits">
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={el => (inputRefs.current[i] = el)}
                    maxLength={1}
                    inputMode="numeric"
                    value={d}
                    onChange={e => handleDigitChange(i, e.target.value)}
                  />
                ))}
              </div>
              <div className="resend-row">
                Didn't get a code? <a onClick={handleResend}>Resend OTP</a>
                {rerequestCount > 0 && <span> ({rerequestCount} resent)</span>}
              </div>
              <button className="btn btn-primary" disabled={verifying} onClick={handleVerify}>
                {verifying ? 'Verifying…' : 'Confirm transfer'}
              </button>
            </>
          )}

          {label === 1 && callOutcome === 'suspicious' && !otpSent && !otpSending && (
            <button className="btn btn-secondary" style={{ marginTop: 12 }} onClick={handleRecordWithoutOtp}>
              Record session (no OTP captured)
            </button>
          )}
        </>
      )}
    </div>
  );
}
