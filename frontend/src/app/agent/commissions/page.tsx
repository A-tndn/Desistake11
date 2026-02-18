'use client';

import { useEffect, useState } from 'react';
import { agentService } from '@/services/agent.service';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { TrendingUp, Calendar, Search } from 'lucide-react';

export default function CommissionsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const now = new Date();
    const monthAgo = new Date(now);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    setFromDate(monthAgo.toISOString().split('T')[0]);
    setToDate(now.toISOString().split('T')[0]);
  }, []);

  const handleSearch = async () => {
    setLoading(true);
    setHasSearched(true);
    try {
      const res = await agentService.getCommissionReport({ from: fromDate, to: toDate });
      setData((res as any).data || []);
    } catch (err) { console.error('Failed', err); }
    finally { setLoading(false); }
  };

  const commissions = Array.isArray(data) ? data : data?.commissions || [];

  return (
    <div>
      <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-brand-teal" /> Commissions
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
            className="h-10 px-4 bg-brand-teal text-white rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50">
            {loading ? 'Loading...' : 'Search'}
          </button>
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
        {!hasSearched ? (
          <div className="p-12 text-center text-muted-foreground text-sm">Click Search to view commissions</div>
        ) : loading ? (
          <div className="p-12 text-center text-muted-foreground text-sm">Loading...</div>
        ) : commissions.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">No commission data found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900 text-white">
                <tr>
                  {['Date', 'Match/Bet', 'Player', 'Bet Amount', 'Rate', 'Commission', 'Status'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {commissions.map((c: any, idx: number) => (
                  <tr key={c.id || idx} className="hover:bg-muted/30">
                    <td className="px-3 py-2 text-xs text-muted-foreground">{formatDate(c.createdAt)}</td>
                    <td className="px-3 py-2 text-xs">{c.bet?.match?.name || c.matchName || '-'}</td>
                    <td className="px-3 py-2 text-xs">{c.bet?.user?.displayName || '-'}</td>
                    <td className="px-3 py-2 text-sm">{formatCurrency(Number(c.basedOnAmount || c.betAmount || 0))}</td>
                    <td className="px-3 py-2 text-xs">{Number(c.commissionRate || 0).toFixed(1)}%</td>
                    <td className="px-3 py-2 text-sm font-bold text-green-600">{formatCurrency(Number(c.commissionAmount || 0))}</td>
                    <td className="px-3 py-2">
                      <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium',
                        c.paid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700')}>
                        {c.paid ? 'Paid' : 'Pending'}
                      </span>
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
