import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { nanoid } from 'nanoid';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;
const DEV_MODE_NO_SMS = process.env.DEV_MODE_NO_SMS === 'true';

// ---------- Twilio client (only initialised if real credentials exist) ----------
let twilioClient = null;
if (!DEV_MODE_NO_SMS) {
  const twilio = (await import('twilio')).default;
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

function genOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}
function genAccountNumber() {
  return 'AC' + Math.floor(100000 + Math.random() * 900000);
}
function randomName() {
  const first = ['Nimal', 'Saman', 'Kumari', 'Anjali', 'Ruwan', 'Tharindu', 'Dilani', 'Chamath', 'Hasini', 'Pradeep'];
  const last = ['Perera', 'Silva', 'Fernando', 'Jayasuriya', 'Wickrama', 'Rathnayake', 'Senanayake', 'Gunasekara'];
  return `${first[Math.floor(Math.random() * first.length)]} ${last[Math.floor(Math.random() * last.length)]}`;
}

// ===================================================================
// GET or CREATE a participant's simulated account
// ===================================================================
app.post('/api/participant/init', async (req, res) => {
  const { participantId } = req.body;
  if (!participantId) return res.status(400).json({ error: 'participantId required' });

  let acct = db.data.participantAccounts[participantId];

  if (!acct) {
    const numHistorical = 2 + Math.floor(Math.random() * 3);
    const beneficiaries = Array.from({ length: numHistorical }, () => ({
      name: randomName(),
      acc: genAccountNumber(),
    }));
    acct = {
      balance: 50000 + Math.random() * 350000,
      avgAmount: 5000 + Math.random() * 10000,
      beneficiaries,
      lastLoginTime: Date.now(),
    };
    db.data.participantAccounts[participantId] = acct;
  } else {
    acct.lastLoginTime = Date.now();
  }
  await db.write();

  res.json({
    balance: acct.balance,
    avgAmount: acct.avgAmount,
    beneficiaries: acct.beneficiaries,
    loginTime: Date.now(),
  });
});

// ===================================================================
// REQUEST an OTP — sends a real SMS (or logs to console in dev mode)
// ===================================================================
app.post('/api/otp/request', async (req, res) => {
  const { phoneNumber, label } = req.body; // label: 0 = genuine, 1 = coached/fraud
  if (!phoneNumber) return res.status(400).json({ error: 'phoneNumber required' });

  const code = genOtp();
  const challengeId = nanoid(10);

  db.data.otpChallenges[challengeId] = {
    phoneNumber, code, label,
    requestedAt: Date.now(),
    rerequestCount: 0,
    failedAttempts: 0,
  };
  await db.write();

  if (DEV_MODE_NO_SMS) {
    console.log(`\n[DEV MODE] OTP for ${phoneNumber}: ${code}\n`);
  } else {
    try {
      await twilioClient.messages.create({
        body: `Your SecureBank verification code is ${code}. Do not share this with anyone.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber,
      });
    } catch (err) {
      console.error('Twilio send failed:', err.message);
      return res.status(500).json({ error: 'SMS send failed', detail: err.message });
    }
  }

  res.json({ challengeId, requestedAt: db.data.otpChallenges[challengeId].requestedAt });
});

// ===================================================================
// RESEND OTP — increments the rerequest counter on the same challenge
// ===================================================================
app.post('/api/otp/resend', async (req, res) => {
  const { challengeId } = req.body;
  const challenge = db.data.otpChallenges[challengeId];
  if (!challenge) return res.status(404).json({ error: 'challenge not found' });

  challenge.rerequestCount += 1;
  await db.write();

  if (DEV_MODE_NO_SMS) {
    console.log(`\n[DEV MODE] Resent OTP for ${challenge.phoneNumber}: ${challenge.code}\n`);
  } else {
    try {
      await twilioClient.messages.create({
        body: `Your SecureBank verification code is ${challenge.code}. Do not share this with anyone.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: challenge.phoneNumber,
      });
    } catch (err) {
      return res.status(500).json({ error: 'SMS resend failed', detail: err.message });
    }
  }

  res.json({ rerequestCount: challenge.rerequestCount });
});

// ===================================================================
// VERIFY OTP — checks code, tracks failed attempts, returns response time
// ===================================================================
app.post('/api/otp/verify', async (req, res) => {
  const { challengeId, enteredCode } = req.body;
  const challenge = db.data.otpChallenges[challengeId];
  if (!challenge) return res.status(404).json({ error: 'challenge not found' });

  if (enteredCode !== challenge.code) {
    challenge.failedAttempts += 1;
    await db.write();
    return res.json({ success: false, failedAttempts: challenge.failedAttempts });
  }

  const entryTime = Date.now();
  const responseTimeSeconds = (entryTime - challenge.requestedAt) / 1000;

  res.json({
    success: true,
    otpResponseTime: +responseTimeSeconds.toFixed(1),
    otpRerequestCount: challenge.rerequestCount,
    failedOtpAttempts: challenge.failedAttempts,
    callInProgressFlag: challenge.label, // by construction: coached sessions = 1, genuine = 0
  });
});

// ===================================================================
// SUBMIT a completed session row into the dataset
// ===================================================================
app.post('/api/session/submit', async (req, res) => {
  const {
    participantId, phoneNumber, label,
    type, amount, isNewBeneficiary, destName, destAcc,
    otpResponseTime, callInProgressFlag, otpRerequestCount, failedOtpAttempts,
    transactionToLoginGap, noOfTransactionsPast10min,
  } = req.body;

  const acct = db.data.participantAccounts[participantId];
  if (!acct) return res.status(400).json({ error: 'participant not initialised' });

  const oldBalance = acct.balance;
  const newBalance = oldBalance - amount;
  const amountToAvgRatio = +(amount / acct.avgAmount).toFixed(2);
  const timeOfDay = new Date().getHours();

  const row = {
    id: db.data.nextSessionId++,
    participant_id: participantId,
    phone_number: phoneNumber,
    created_at: new Date().toISOString(),
    type,
    amount,
    oldbalanceOrg: +oldBalance.toFixed(2),
    newbalanceOrig: +newBalance.toFixed(2),
    dest_name: destName,
    dest_acc: destAcc,
    is_new_beneficiary: isNewBeneficiary ? 1 : 0,
    amount_to_avg_ratio: amountToAvgRatio,
    otp_response_time: otpResponseTime,
    call_in_progress_flag: callInProgressFlag,
    otp_rerequest_count: otpRerequestCount,
    no_of_transactions_past10min: noOfTransactionsPast10min,
    time_of_day: timeOfDay,
    failed_otp_attempts: failedOtpAttempts,
    transaction_to_login_gap: transactionToLoginGap,
    is_otp_abuse_fraud: label,
  };

  db.data.sessions.push(row);

  // update participant's running account state so future sessions stay consistent
  if (isNewBeneficiary) {
    acct.beneficiaries.push({ name: destName, acc: destAcc });
  }
  acct.balance = newBalance;

  await db.write();

  res.json({ success: true, totalRows: db.data.sessions.length });
});

// ===================================================================
// DATASET — view recent rows + summary stats
// ===================================================================
app.get('/api/dataset/summary', (req, res) => {
  const all = db.data.sessions;
  const fraud = all.filter(r => r.is_otp_abuse_fraud === 1).length;
  const recent = all.slice(-10).reverse();
  res.json({ total: all.length, fraud, genuine: all.length - fraud, recent });
});

// ===================================================================
// EXPORT — full dataset as downloadable CSV
// ===================================================================
app.get('/api/dataset/export', (req, res) => {
  const rows = db.data.sessions;
  if (rows.length === 0) {
    return res.status(404).send('No data collected yet');
  }
  const cols = Object.keys(rows[0]);
  const csvLines = [
    cols.join(','),
    ...rows.map(r => cols.map(c => {
      const v = r[c];
      if (typeof v === 'string' && v.includes(',')) return `"${v}"`;
      return v;
    }).join(','))
  ];
  const csv = csvLines.join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="otp_abuse_dataset.csv"');
  res.send(csv);
});

// ===================================================================
// MODE — researcher-controlled global session mode
// ===================================================================
app.get('/api/mode', (req, res) => {
  res.json({ mode: db.data.currentMode || 'genuine' });
});

app.post('/api/mode', async (req, res) => {
  const { mode } = req.body;
  if (mode !== 'genuine' && mode !== 'fraud') {
    return res.status(400).json({ error: "mode must be 'genuine' or 'fraud'" });
  }
  db.data.currentMode = mode;
  await db.write();
  res.json({ mode });
});

app.get('/api/health', (req, res) => res.json({ ok: true, devMode: DEV_MODE_NO_SMS }));

// Serve the built React app for all non-API routes
const clientDist = path.join(__dirname, '../client/dist');
app.use(express.static(clientDist));
app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 OTP research server running at http://localhost:${PORT}`);
  console.log(DEV_MODE_NO_SMS
    ? '⚠️  DEV_MODE_NO_SMS is ON — OTPs will be printed to this console, not sent via SMS.\n'
    : '📱 Real SMS mode is ON — make sure your Twilio numbers are verified.\n');
});
