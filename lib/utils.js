export function genOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function genAccountNumber() {
  return 'AC' + Math.floor(100000 + Math.random() * 900000);
}

export function randomName() {
  const first = ['Nimal', 'Saman', 'Kumari', 'Anjali', 'Ruwan', 'Tharindu', 'Dilani', 'Chamath', 'Hasini', 'Pradeep'];
  const last = ['Perera', 'Silva', 'Fernando', 'Jayasuriya', 'Wickrama', 'Rathnayake', 'Senanayake', 'Gunasekara'];
  return `${first[Math.floor(Math.random() * first.length)]} ${last[Math.floor(Math.random() * last.length)]}`;
}

export function genChallengeId() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 10);
}