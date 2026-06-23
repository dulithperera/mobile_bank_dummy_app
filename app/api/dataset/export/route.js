import { getAllSessions } from '@/lib/db';

export async function GET() {
  const rows = await getAllSessions();

  if (rows.length === 0) {
    return new Response('No data collected yet', { status: 404 });
  }

  const cols = Object.keys(rows[0]);
  const csvLines = [
    cols.join(','),
    ...rows.map(r => cols.map(c => {
      const v = r[c];
      return typeof v === 'string' && v.includes(',') ? `"${v}"` : v;
    }).join(',')),
  ];

  return new Response(csvLines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="otp_abuse_dataset.csv"',
    },
  });
}