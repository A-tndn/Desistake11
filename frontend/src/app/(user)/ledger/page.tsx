'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Redirect old /ledger route to /account (P&L tab)
export default function LedgerRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/account');
  }, [router]);

  return (
    <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
      Redirecting to Account Statement...
    </div>
  );
}
