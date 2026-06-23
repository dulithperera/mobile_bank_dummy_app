# OTP-Abuse Research Data Collector

A small full-stack app for collecting synthetic-but-behaviourally-real data on how people
respond to OTP entry under two conditions:

- **Genuine** — logging in and transferring money normally
- **Coached (fraud)** — being walked through the same transfer over a real phone call by a
  "fraudster" (a friend reading a script), while a real OTP is sent to the volunteer's phone

Every session is recorded as one row in a growing dataset (`otp_response_time`,
`otp_rerequest_count`, `failed_otp_attempts`, `transaction_to_login_gap`, etc.), exportable
as a CSV.

## Project structure

```
otp-research-app/
├── server/      ← Node.js + Express backend (sends real SMS, stores data)
└── client/      ← React + Vite frontend (the app your friends use)
```

## 1. Run the backend

```bash
cd server
npm install
cp .env.example .env
```

Open `.env` and decide:

- **For testing without using your Twilio SMS credits:** leave `DEV_MODE_NO_SMS=true`.
  OTPs will print to your terminal instead of being texted — useful while you're building
  and testing the flow yourself.
- **For real data collection (real SMS):** set `DEV_MODE_NO_SMS=false`, then fill in
  `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_PHONE_NUMBER` (see "Setting up
  Twilio" below).

Then start the server:

```bash
npm start
```

You should see:
```
🚀 OTP research server running at http://localhost:4000
```

Leave this terminal running.

## 2. Run the frontend

In a **new terminal**:

```bash
cd client
npm install
npm run dev
```

You'll see a local URL like `http://localhost:5173`. Open it in your browser to try it
yourself first.

## 3. Letting friends use it on their own phones

Vite's dev server is already configured (`host: true` in `vite.config.js`) to be reachable
from other devices on the same Wi-Fi network as your computer.

1. Find your computer's local IP address:
   - **Mac:** System Settings → Wi-Fi → Details → IP Address
   - **Windows:** `ipconfig` in Command Prompt, look for "IPv4 Address"
2. In `client/src/api.js`, change `API_BASE` to use that IP instead of `localhost`:
   ```js
   export const API_BASE = 'http://192.168.1.42:4000'; // your actual IP
   ```
3. Restart the frontend (`npm run dev` again).
4. On a friend's phone, **connected to the same Wi-Fi**, open:
   ```
   http://192.168.1.42:5173
   ```
   (using your IP, not this example)

This works for friends in the same building/Wi-Fi network as you. For friends who are
truly remote (different city, different network), you'll need to deploy both the server
and client publicly — see "Deploying publicly" below.

## Setting up Twilio (for real SMS)

1. Go to https://www.twilio.com/try-twilio and create a free trial account (no credit
   card needed).
2. From the Twilio Console homepage, copy your **Account SID** and **Auth Token** into
   `.env`.
3. Get a trial phone number: Console → Phone Numbers → Buy a Number (free on trial) →
   copy it into `TWILIO_PHONE_NUMBER` in `.env` (format: `+1XXXXXXXXXX`).
4. **Important trial limitation:** Twilio trial accounts can only send SMS to phone
   numbers you've manually verified first. For each volunteer:
   - Go to Console → Phone Numbers → Verified Caller IDs → Add a new number
   - Enter their number, they'll get a verification call/code to confirm
   - Only after this can your app successfully text them
5. You get 100 free SMS messages on the trial — plan your number of test sessions
   accordingly (roughly 50 volunteers × 2 modes each, or fewer volunteers doing several
   rounds).

## Deploying publicly (for truly remote friends)

Free options that work well for a project like this:

- **Backend:** [Render](https://render.com) (free web service tier) or
  [Railway](https://railway.app)
- **Frontend:** [Vercel](https://vercel.com) or [Netlify](https://netlify.com)

General steps:
1. Push this project to a GitHub repository.
2. On Render/Railway, create a new Web Service pointing at the `server/` folder, and add
   your `.env` variables in their dashboard's environment variables section.
3. On Vercel/Netlify, create a new project pointing at the `client/` folder.
4. In `client/src/api.js`, set `API_BASE` to your deployed backend's URL (e.g.
   `https://your-app.onrender.com`).
5. Share the Vercel/Netlify URL with your friends — it'll work from anywhere.

## Viewing and exporting the dataset

- In the app, tap **"View collected dataset"** from the home screen to see live row counts
  and a fraud/genuine split.
- Tap **"Export full dataset as CSV"** to download everything collected so far — or visit
  `http://localhost:4000/api/dataset/export` directly in a browser.
- The raw data also lives in `server/research_data.json` if you want to inspect or back it
  up directly.

## What gets recorded per session

| Column | Description |
|---|---|
| `type` | TRANSFER or PAYMENT |
| `amount` | Transfer amount entered by the volunteer |
| `oldbalanceOrg` / `newbalanceOrig` | Simulated account balance before/after |
| `dest_name` / `dest_acc` | Recipient details (existing or newly generated) |
| `is_new_beneficiary` | Whether the volunteer picked a brand-new recipient |
| `amount_to_avg_ratio` | Amount relative to that participant's simulated average |
| `otp_response_time` | **Real measured time** between OTP sent and submitted |
| `call_in_progress_flag` | 1 if this was a "coached" session, 0 if genuine |
| `otp_rerequest_count` | **Real count** of "Resend OTP" taps |
| `no_of_transactions_past10min` | Simulated transaction velocity signal |
| `time_of_day` | Real hour of day the session ran |
| `failed_otp_attempts` | **Real count** of incorrect code entries |
| `transaction_to_login_gap` | **Real measured time** between login and starting the transfer |
| `is_otp_abuse_fraud` | The label — 1 for coached sessions, 0 for genuine |

The bolded ones are real measured human behaviour, not simulated — these are the features
most worth highlighting to your supervisor as genuinely collected data rather than assumed
distributions.
