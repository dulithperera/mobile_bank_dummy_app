'use client';

export default function Confirmation({ session, totalRows, onAnother }) {
  return (
    <div className="screen">
      <div className="success-mark">✓</div>
      <h1 className="title" style={{ textAlign: 'center' }}>Transfer complete</h1>
      <p className="lede" style={{ textAlign: 'center' }}>
        This session has been recorded as row #{totalRows} in the dataset.
      </p>

      <div className="confirm-summary">
        <div className="confirm-row">
          <span className="k">Mode</span>
          <span className="v">{session.label === 1 ? 'Coached (fraud)' : 'Genuine'}</span>
        </div>
        <div className="confirm-row">
          <span className="k">OTP response time</span>
          <span className="v">{session.otpResponseTime}s</span>
        </div>
        <div className="confirm-row">
          <span className="k">Resend count</span>
          <span className="v">{session.otpRerequestCount}</span>
        </div>
        <div className="confirm-row">
          <span className="k">Failed attempts</span>
          <span className="v">{session.failedOtpAttempts}</span>
        </div>
        <div className="confirm-row">
          <span className="k">New beneficiary</span>
          <span className="v">{session.isNewBeneficiary ? 'Yes' : 'No'}</span>
        </div>
      </div>

      <button className="btn btn-primary" onClick={onAnother}>Run another session</button>
    </div>
  );
}