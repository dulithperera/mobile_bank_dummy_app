import { useState } from 'react';

export default function Dashboard({ account, onSubmit }) {
  const [selectedBen, setSelectedBen] = useState(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualAcc, setManualAcc] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('TRANSFER');

  function pickExisting(b) {
    setShowManualEntry(false);
    setManualName('');
    setManualAcc('');
    setSelectedBen({ ...b, isNew: false });
  }

  function pickNew() {
    setSelectedBen(null);
    setShowManualEntry(true);
    setManualName('');
    setManualAcc('');
  }

  function handleManualChange(name, acc) {
    if (name.trim() && acc.trim()) {
      setSelectedBen({ name: name.trim(), acc: acc.trim(), isNew: true });
    } else {
      setSelectedBen(null);
    }
  }

  return (
    <div className="screen">
      <div className="balance-card">
        <div className="label">AVAILABLE BALANCE</div>
        <div className="amount">LKR {Math.round(account.balance).toLocaleString()}</div>
        <div className="acct">{account.acctNumber}</div>
      </div>

      <h1 className="title" style={{ fontSize: 16 }}>Send money</h1>
      <p className="lede" style={{ marginBottom: 12 }}>Choose a recipient, then enter an amount.</p>

      <div style={{ marginBottom: 14 }}>
        {account.beneficiaries.map((b, i) => (
          <span
            key={i}
            className={`beneficiary-chip ${selectedBen?.acc === b.acc ? 'selected' : ''}`}
            onClick={() => pickExisting(b)}
          >
            {b.name}
          </span>
        ))}
        <span
          className={`beneficiary-chip new ${showManualEntry ? 'selected' : ''}`}
          onClick={pickNew}
        >
          + New recipient
        </span>
      </div>

      {showManualEntry && (
        <>
          <div className="field">
            <label>RECIPIENT NAME</label>
            <input
              type="text"
              placeholder="Full name"
              value={manualName}
              onChange={(e) => {
                setManualName(e.target.value);
                handleManualChange(e.target.value, manualAcc);
              }}
            />
          </div>
          <div className="field">
            <label>ACCOUNT NUMBER</label>
            <input
              type="text"
              placeholder="e.g. AC123456"
              value={manualAcc}
              onChange={(e) => {
                setManualAcc(e.target.value);
                handleManualChange(manualName, e.target.value);
              }}
            />
          </div>
        </>
      )}

      <div className="field">
        <label>AMOUNT (LKR)</label>
        <input
          type="number"
          placeholder="e.g. 25000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>

      <div className="field">
        <label>TRANSACTION TYPE</label>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="TRANSFER">Transfer to another account</option>
          <option value="PAYMENT">Payment to mobile agent</option>
        </select>
      </div>

      <button
        className="btn btn-primary"
        disabled={!selectedBen || !amount || Number(amount) <= 0}
        onClick={() => onSubmit({ amount: Number(amount), type, beneficiary: selectedBen })}
      >
        Continue
      </button>
    </div>
  );
}