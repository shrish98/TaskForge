'use client';

export const dynamic = 'force-dynamic';

import { AuthScreen } from '@/components/auth/AuthScreen';

export default function RegisterPage() {
  return <AuthScreen mode="register" />;
}
