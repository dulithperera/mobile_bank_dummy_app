import { useEffect, useState } from 'react';
import { api } from './api';

export default function DatasetView({ onBack, onModeChange }) {
  const [summary, setSummary] = useState(null);
  const [mode, setMode] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getSummary().then(setSummary).catch(() => setSummary(null));
    api.getMode().then(res => setMode(res.mode)).catch(() => {});
  }, []);

  async function handleSetMode(newMode) {
    setSaving(true);
    try {
      await api.setMode(newMode);
      setMode(newMode);
      onModeChange?.(newMode);
    } finally {
      setSaving(false);
    }
  }

  if (!summary) return <div className="screen"><p className="lede">Loading dataset…</p></div>;

  const cols = summary.recent.length ? Object.keys(summary.recent[0]) : [];

  return (
    <div className="screen">
      <span className="back-link" onClick={onBack}>← back</span>
      <h1 className="title">Collected dataset</h1>
      <div className="progress-pill">{summary.total} TOTAL ROWS</div>

      <div className="stat-grid">
        <div className="stat-box">
          <div className="n">{summary.genuine}</div>
          <div className="l">GENUINE (label 0)</div>
        </div>
        <div className="stat-box">
          <div className="n">{summary.fraud}</div>
          <div className="l">COACHED (label 1)</div>
        </div>
      </div>

      <div style={{ margin: '20px 0', padding: '16px', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 10, color: 'var(--ink-soft)' }}>SESSION MODE</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={mode === 'genuine' ? 'btn btn-primary' : 'btn btn-secondary'}
            style={{ flex: 1 }}
            disabled={saving || mode === 'genuine'}
            onClick={() => handleSetMode('genuine')}
          >
            Genuine (label 0)
          </button>
          <button
            className={mode === 'fraud' ? 'btn btn-coral' : 'btn btn-secondary'}
            style={{ flex: 1 }}
            disabled={saving || mode === 'fraud'}
            onClick={() => handleSetMode('fraud')}
          >
            Coached (label 1)
          </button>
        </div>
        {mode && (
          <div style={{ fontSize: 11, marginTop: 8, color: 'var(--ink-soft)' }}>
            All new sessions will be recorded as <strong>{mode === 'fraud' ? 'Coached (label 1)' : 'Genuine (label 0)'}</strong>.
          </div>
        )}
      </div>

      <div className="table-scroll">
        <table className="dataset">
          <thead>
            <tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {summary.recent.map((r, i) => (
              <tr key={i}>{cols.map((c) => <td key={c}>{String(r[c])}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 11, color: 'var(--ink-soft)', marginBottom: 16 }}>
        Showing last {summary.recent.length} of {summary.total} rows. Export to see all.
      </p>

      <a href={api.exportCsvUrl()} target="_blank" rel="noreferrer">
        <button className="btn btn-coral">⬇ Export full dataset as CSV</button>
      </a>
      <button className="btn btn-secondary" onClick={onBack}>Back</button>
    </div>
  );
}