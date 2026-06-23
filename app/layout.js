import './globals.css';

export const metadata = {
  title: 'SecureBank — OTP Research',
  description: 'OTP abuse fraud behaviour data collector',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}