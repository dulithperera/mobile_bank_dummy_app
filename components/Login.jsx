'use client';

import { useState } from 'react';

export default function Login({ onSubmit, error }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  return (
    <div className="screen">
      <h1 className="title">Log in</h1>
      <p className="lede">
        Use your real phone number — this is where your OTP will actually be sent. Use any
        name you like as your volunteer ID.
      </p>

      {error && <div className="error-banner">{error}</div>}

      <div className="field">
        <label>VOLUNTEER NAME / ID</label>
        <input
          type="text"
          placeholder="e.g. Volunteer 1"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="field">
        <label>PHONE NUMBER (with country code, no +)</label>
        <input
          type="tel"
          placeholder="94 7X XXX XXXX"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>

      <button
        className="btn btn-primary"
        disabled={!name.trim() || !phone.trim()}
        onClick={() => {
          const digits = phone.trim().replace(/[^0-9]/g, '');
          onSubmit(name.trim(), `+${digits}`);
        }}
      >
        Log in
      </button>
    </div>
  );
}