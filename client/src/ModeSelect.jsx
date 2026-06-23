export default function ModeSelect({ selectedMode, setSelectedMode, onContinue }) {
  return (
    <div className="screen">
      <h1 className="title">Start a session</h1>
      <p className="lede">
        Choose which behaviour this session simulates. Each volunteer should complete both
        modes — the app measures the timing and behaviour automatically.
      </p>

      <div
        className={`mode-card ${selectedMode === 'genuine' ? 'selected' : ''}`}
        onClick={() => setSelectedMode('genuine')}
      >
        <h3>🙂 Genuine session <span className="mode-tag">label = 0</span></h3>
        <p>Log in and send a transfer normally, at your own pace. No one is guiding you.</p>
      </div>

      <div
        className={`mode-card ${selectedMode === 'fraud' ? 'selected' : ''}`}
        onClick={() => setSelectedMode('fraud')}
      >
        <h3>📞 Coached session <span className="mode-tag coral">label = 1</span></h3>
        <p>
          Have a friend call your real phone and read the script shown on screen, as if they
          were a scammer guiding you through the transfer. The real OTP will be sent to your
          phone by SMS — follow their instructions to read it back, then type it in.
        </p>
      </div>

      <button className="btn btn-primary" disabled={!selectedMode} onClick={onContinue}>
        Continue
      </button>

    </div>
  );
}
