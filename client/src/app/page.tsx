'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { LandingPage } from '@/components/landing/LandingPage';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { Console } from '@/components/console/Console';

export default function HomePage() {
  // Signed-in visitors get the console; everyone else, and the server render, gets the landing page.
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    setSignedIn(Boolean(localStorage.getItem('accessToken')));
  }, []);

  if (!signedIn) return <LandingPage />;

  return (
    <AuthGuard>
      <Console />
    </AuthGuard>
  );
}
