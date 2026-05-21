import './globals.css';
import React from 'react';

export const metadata = {
  title: 'LingoFlow — SaaS Language Institute Management Platform',
  description: 'Streamline schedule coordination, hour logging, attendance, and student reports.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-slate-950 text-slate-100">
        {children}
      </body>
    </html>
  );
}
