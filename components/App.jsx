'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import AgeSelect from './AgeSelect';
import Login from './Login';
import Dashboard from './Dashboard';
import OtpScreen from './OtpScreen';
import Confirmation from './Confirmation';
import DatasetView from './DatasetView';

export default function App() {
  const [screen, setScreen] = useState('age');
  const [mode, setMode] = useState('genuine');
  const [loginError, setLoginError] = useState('');

  const [ageCategory, setAgeCategory] = useState('');
  const [participantId, setParticipantId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [account, setAccount] = useState(null);
  const [loginTime, setLoginTime] = useState(null);

  const [transferInfo, setTransferInfo] = useState(null);
  const [transferStartTime, setTransferStartTime] = useState(null);

  const [lastSession, setLastSession] = useState(null);
  const [totalRows, setTotalRows] = useState(0);
  const [testData, setTestData] = useState([]);

  const label = mode === 'fraud' ? 1 : 0;

  useEffect(() => {
    api.getMode().then(res => setMode(res.mode)).catch(() => {});
    api.getSummary().then(res => setTotalRows(res.total)).catch(() => {});

    if (supabase) {
      supabase
        .from('test')
        .select('name')
        .then(({ data }) => {
          if (data) {
            setTestData(data);
          }
        })
        .catch(err => console.error('Error fetching test table:', err));
    }
  }, []);

  async function handleLoginSubmit(name, phone) {
    setParticipantId(name);
    setPhoneNumber(phone);
    setLoginError('');
    try {
      const res = await api.initParticipant(name);
      setAccount({
        balance: res.balance,
        avgAmount: res.avgAmount,
        beneficiaries: res.beneficiaries,
        acctNumber: 'AC' + Math.floor(100000 + Math.random() * 900000),
      });
      setLoginTime(Date.now());
      setScreen('dashboard');
    } catch (err) {
      setLoginError('Could not start session: ' + err.message);
    }
  }

  function handleTransferSubmit(info) {
    setTransferInfo(info);
    setTransferStartTime(Date.now());
    setScreen('otp');
  }

  async function handleOtpVerified(otpResult) {
    const transactionToLoginGap = +((transferStartTime - loginTime) / 1000).toFixed(1);
    const noOfTransactionsPast10min = label === 1
      ? Math.floor(Math.random() * 4) + 1
      : Math.floor(Math.random() * 2);

    const payload = {
      participantId,
      phoneNumber,
      ageCategory,
      label,
      type: transferInfo.type,
      amount: transferInfo.amount,
      isNewBeneficiary: transferInfo.beneficiary.isNew,
      destName: transferInfo.beneficiary.name,
      destAcc: transferInfo.beneficiary.acc,
      otpResponseTime: otpResult.otpResponseTime,
      callInProgressFlag: otpResult.callInProgressFlag,
      otpRerequestCount: otpResult.otpRerequestCount,
      failedOtpAttempts: otpResult.failedOtpAttempts,
      avgInterDigitTime: otpResult.avgInterDigitTime,
      transactionToLoginGap,
      noOfTransactionsPast10min,
    };

    try {
      const res = await api.submitSession(payload);
      setTotalRows(res.totalRows);
      setLastSession({
        label,
        otpResponseTime: otpResult.otpResponseTime,
        otpRerequestCount: otpResult.otpRerequestCount,
        failedOtpAttempts: otpResult.failedOtpAttempts,
        isNewBeneficiary: transferInfo.beneficiary.isNew,
      });
      setScreen('confirm');
    } catch (err) {
      alert('Could not save session: ' + err.message);
    }
  }

  function resetForNewSession() {
    setTransferInfo(null);
    setAgeCategory('');
    setScreen('age');
  }

return (
    <div className="app-shell">
      <div className="research-bar">
        <span>
          <span className="dot"></span>RESEARCH MODE
        </span>
        {testData.length > 0 && (
          <span style={{ marginLeft: '15px', color: '#ffb300', fontWeight: 'bold' }}>
            [SUPABASE TEST: {testData.map(d => d.name).join(', ')}]
          </span>
        )}
        <span>SESSIONS: {totalRows}</span>
      </div>
      <div className="app-header">
        <div className="brand"><span className="mark">SB</span>SecureBank</div>
        <div className="sub">otp-abuse &amp; fraud behaviour data collector</div>
      </div>

      {screen === 'age' && (
        <AgeSelect onSelect={cat => { setAgeCategory(cat); setScreen('login'); }} />
      )}

      {screen === 'login' && (
        <Login onSubmit={handleLoginSubmit} error={loginError} />
      )}

      {screen === 'dashboard' && account && (
        <Dashboard account={account} onSubmit={handleTransferSubmit} />
      )}

      {screen === 'otp' && (
        <OtpScreen
          phoneNumber={phoneNumber}
          label={label}
          transferInfo={transferInfo}
          onVerified={handleOtpVerified}
        />
      )}

      {screen === 'confirm' && lastSession && (
        <Confirmation
          session={lastSession}
          totalRows={totalRows}
          onAnother={resetForNewSession}
        />
      )}

      {screen === 'dataset' && (
        <DatasetView
          onBack={() => setScreen('login')}
        />
      )}
    </div>
  );
}