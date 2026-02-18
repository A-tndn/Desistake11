'use client';

import { useEffect, useState } from 'react';
import { agentService } from '@/services/agent.service';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Receipt, Calendar, Search } from 'lucide-react';

export default function MyLedgerPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const now = new Date();
    const monthAgo = new Date(now);
    monthAgo.setDate(monthAgo.getDate() - 30);
    setFromDate(monthAgo.toISOString().split('T')[0]);
    setToDate(now.toISOString().split('T')[0]);
  }, []);

  const handleSearch = async () => {
    setLoading(true);
    setHasSearched(true);
    try {
      const res = await agentService.getAccountStatement({ from: fromDate, to: toDate });
      setTransactions((res as any).data || []);
    } catch (err) { console.error('Failed to load ledger', err); }
    finally { setLoading(false); }
  };

  const isCredit = (type: string) =>
    ['CREDIT_TRANSFER', 'COMMISSION_EARNED', 'SETTLEMENT_PAYOUT'].includes(type);

  return (
    <div>
      <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-4">
        <Receipt className="w-5 h-5 text-brand-teal" /> My Ledger
      </h2>

      <div className="mb-4 rounded-lg border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-[140px]">
            <label className="block text-xs text-muted-foreground font-medium mb-1">From</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
              className="w-full h-10 px-3 border rounded-md text-sm" />
          </div>
          <div className="min-w-[140px]">
            <label className="block text-xs text-muted-foreground font-medium mb-1">To</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
              className="w-full h-10 px-3 border rounded-md text-sm" />
          </div>
          <button onClick={handleSearch} disabled={loading}
            className="h-10 px-4 bg-brand-teal text-white rounded-md text-sm font-medium flex items-center gap-2 hover:opacity-90 disabled:opacity-50">
            <Search className="w-4 h-4" /> {loading ? 'Loading...' : 'Search'}
          </button>
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
        {!hasSearched ? (
          <div className="p-12 text-center text-muted-foreground text-sm">Click Search to view your ledger</div>
        ) : loading ? (
          <div className="p-12 text-center text-muted-foreground text-sm">Loading...</div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">No transactions found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900 text-white">
                <tr>
                  {['Date', 'Type', 'Description', 'Credit', 'Debit', 'Balance'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {transactions.map((t: any, idx: number) => (
                  <tr key={t.id || idx} className="hover:bg-muted/30">
                    <td className="px-3 py-2 text-xs text-muted-foreground">{formatDate(t.createdAt)}</td>
                    <td className="px-3 py-2">
                      <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium',
                        isCredit(t.type) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                        {t.type?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{t.description || '-'}</td>
                    <td className="px-3 py-2 text-sm font-medium text-green-600">
                      {isCredit(t.type) ? formatCurrency(Number(t.amount)) : ''}
                    </td>
                    <td className="px-3 py-2 text-sm font-medium text-red-600">
                      {!isCredit(t.type) ? formatCurrency(Number(t.amount)) : ''}
                    </td>
                    <td className="px-3 py-2 text-sm font-medium">
                      {t.balanceAfter ? formatCurrency(Number(t.balanceAfter)) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
