'use client';

export const dynamic = 'force-dynamic';

import { AuthScreen } from '@/components/auth/AuthScreen';

export default function LoginPage() {
  return <AuthScreen mode="login" />;
}
