import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Saarthi AI | Task Automation & Job Processing Engine',
  description: 'Production-ready Micro-SaaS Job Processing Platform with Real-time WebSockets & BullMQ',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-slate-100 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
