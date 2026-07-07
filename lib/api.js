async function request(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  initParticipant: (participantId) =>
    request('/api/participant/init', { method: 'POST', body: JSON.stringify({ participantId }) }),

  requestOtp: (phoneNumber, label) =>
    request('/api/otp/request', { method: 'POST', body: JSON.stringify({ phoneNumber, label }) }),

  resendOtp: (challengeId) =>
    request('/api/otp/resend', { method: 'POST', body: JSON.stringify({ challengeId }) }),

  verifyOtp: (challengeId, enteredCode) =>
    request('/api/otp/verify', { method: 'POST', body: JSON.stringify({ challengeId, enteredCode }) }),

  submitSession: (payload) =>
    request('/api/session/submit', { method: 'POST', body: JSON.stringify(payload) }),

  getSummary: () => request('/api/dataset/summary'),

  exportCsvUrl: () => '/api/dataset/export',

  getMode: () => request('/api/mode'),

  setMode: (mode) =>
    request('/api/mode', { method: 'POST', body: JSON.stringify({ mode }) }),
};