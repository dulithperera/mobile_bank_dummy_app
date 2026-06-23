// Change this to your deployed backend URL once hosted (e.g. Render/Railway URL).
// While testing locally on your own wifi, your friends' phones can use your computer's
// local IP address instead of "localhost" - e.g. http://192.168.1.42:4000
// In dev, Vite runs on a different port so we need the full server URL.
// In production the frontend is served by the same Express server, so use relative paths.
export const API_BASE = import.meta.env.VITE_API_BASE ?? (import.meta.env.DEV ? 'http://localhost:4000' : '');

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
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

  exportCsvUrl: () => `${API_BASE}/api/dataset/export`,

  getMode: () => request('/api/mode'),

  setMode: (mode) =>
    request('/api/mode', { method: 'POST', body: JSON.stringify({ mode }) }),
};
