import { JSONFilePreset } from 'lowdb/node';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'research_data.json');

const defaultData = {
  sessions: [],
  otpChallenges: {},
  participantAccounts: {},
  nextSessionId: 1,
  currentMode: 'genuine', // 'genuine' | 'fraud' — set by researcher, applies to all sessions
};

const db = await JSONFilePreset(dbPath, defaultData);

export default db;
