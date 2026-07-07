'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function DatasetView({ onBack }) {
  const [summary, setSummary] = useState(null);
  const [mode, setMode] = useState(null);

  useEffect(() => {
    api.getSummary().then(setSummary).catch(() => setSummary(null));
    api.getMode().then(res => setMode(res.mode)).catch(() => {});
  }, []);

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

      {mode && (
        <div style={{ margin: '20px 0', padding: '12px 16px', background: 'var(--paper)', borderRadius: 8, border: '1px solid var(--line)', fontSize: 12, color: 'var(--ink-soft)' }}>
          <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, fontSize: 10 }}>Current mode — </span>
          <strong style={{ color: mode === 'fraud' ? 'var(--coral)' : 'var(--teal)' }}>
            {mode === 'fraud' ? 'Coached (label 1)' : 'Genuine (label 0)'}
          </strong>
        </div>
      )}

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