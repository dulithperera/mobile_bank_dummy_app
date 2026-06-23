import { useState, useEffect, useRef } from 'react';
import { api } from './api';

export default function OtpScreen({ phoneNumber, label, onVerified, onError }) {
  const [challengeId, setChallengeId] = useState(null);
  const [requestedAt, setRequestedAt] = useState(null);
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [elapsed, setElapsed] = useState(0);
  const [rerequestCount, setRerequestCount] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [sending, setSending] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const inputRefs = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    api.requestOtp(phoneNumber, label)
      .then((res) => {
        if (!mounted) return;
        setChallengeId(res.challengeId);
        setRequestedAt(res.requestedAt);
        setSending(false);
      })
      .catch((err) => {
        setErrorMsg('Could not send OTP: ' + err.message);
        setSending(false);
      });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!requestedAt) return;
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - requestedAt) / 1000));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [requestedAt]);

  function handleDigitChange(i, val) {
    if (!/^[0-9]?$/.test(val)) return;
    const next = [...digits];
    next[i] = val;
    setDigits(next);
    if (val && i < 5) inputRefs.current[i + 1]?.focus();
  }

  async function handleResend() {
    if (!challengeId) return;
    const res = await api.resendOtp(challengeId);
    setRerequestCount(res.rerequestCount);
  }

  async function handleVerify() {
    const code = digits.join('');
    if (code.length < 6) {
      setErrorMsg('Enter all 6 digits');
      return;
    }
    setVerifying(true);
    setErrorMsg('');
    try {
      const res = await api.verifyOtp(challengeId, code);
      if (!res.success) {
        setFailedAttempts(res.failedAttempts);
        setErrorMsg('Incorrect code — try again');
        setDigits(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        setVerifying(false);
        return;
      }
      clearInterval(timerRef.current);
      onVerified({
        otpResponseTime: res.otpResponseTime,
        otpRerequestCount: res.otpRerequestCount,
        failedOtpAttempts: res.failedOtpAttempts,
        callInProgressFlag: res.callInProgressFlag,
      });
    } catch (err) {
      setErrorMsg('Verification failed: ' + err.message);
      setVerifying(false);
    }
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  return (
    <div className="screen">
      <h1 className="title" style={{ fontSize: 16 }}>Verify with OTP</h1>

      {label === 1 ? (
        <div className="coaching-script">
          <span className="who">📞 caller script — read aloud to volunteer over a real phone call</span>
          "Hello, this is the bank's fraud department. We've noticed unusual activity and need
          to verify it's really you. A code was just sent to your phone by SMS — please read it
          out to me so I can cancel the suspicious transaction."
        </div>
      ) : (
        <div className="otp-banner">
          🔐 A 6-digit code has been sent to your phone by SMS. Enter it below to confirm your transfer.
        </div>
      )}

      {errorMsg && <div className="error-banner">{errorMsg}</div>}
      {sending && <p className="lede">Sending code to your phone…</p>}

      {!sending && (
        <>
          <div className="otp-timer">{mm}:{ss}</div>
          <div className="otp-digits">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => (inputRefs.current[i] = el)}
                maxLength={1}
                inputMode="numeric"
                value={d}
                onChange={(e) => handleDigitChange(i, e.target.value)}
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
    </div>
  );
}
