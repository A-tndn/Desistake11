'use client';

import { useEffect, useState } from 'react';
import { agentService } from '@/services/agent.service';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { History, Search, Calendar } from 'lucide-react';

export default function BetHistoryPage() {
  const [bets, setBets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    setFromDate(weekAgo.toISOString().split('T')[0]);
    setToDate(now.toISOString().split('T')[0]);
  }, []);

  const handleSearch = async () => {
    setLoading(true);
    setHasSearched(true);
    try {
      const res = await agentService.getBetHistory({
        from: fromDate, to: toDate,
        ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
      });
      setBets((res as any).data || []);
    } catch (err) { console.error('Failed', err); setBets([]); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-4">
        <History className="w-5 h-5 text-brand-teal" /> Bet History
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
          <div className="min-w-[120px]">
            <label className="block text-xs text-muted-foreground font-medium mb-1">Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-10 px-3 border rounded-md text-sm">
              <option value="all">All</option>
              <option value="PENDING">Pending</option>
              <option value="WON">Won</option>
              <option value="LOST">Lost</option>
            </select>
          </div>
          <button onClick={handleSearch} disabled={loading}
            className="h-10 px-4 bg-brand-teal text-white rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50">
            {loading ? 'Loading...' : 'Search'}
          </button>
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
        {!hasSearched ? (
          <div className="p-12 text-center text-muted-foreground text-sm">Click Search to view bet history</div>
        ) : loading ? (
          <div className="p-12 text-center text-muted-foreground text-sm">Loading...</div>
        ) : bets.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">No bets found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900 text-white">
                <tr>
                  {['Match', 'Player', 'Type', 'Selection', 'Amount', 'Odds', 'Status', 'P&L'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {bets.map((bet: any) => (
                  <tr key={bet.id} className="hover:bg-muted/30">
                    <td className="px-3 py-2 text-xs">{bet.match?.name || '-'}</td>
                    <td className="px-3 py-2 text-xs">{bet.user?.displayName || '-'}</td>
                    <td className="px-3 py-2">
                      <span className={cn('text-xs font-bold', bet.isBack ? 'text-blue-600' : 'text-red-500')}>
                        {bet.isBack ? 'BACK' : 'LAY'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs font-medium">{bet.betOn}</td>
                    <td className="px-3 py-2 text-sm font-medium">{formatCurrency(Number(bet.amount))}</td>
                    <td className="px-3 py-2 text-xs">{Number(bet.odds).toFixed(2)}</td>
                    <td className="px-3 py-2">
                      <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium',
                        bet.status === 'WON' ? 'bg-green-100 text-green-700' :
                        bet.status === 'LOST' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700')}>
                        {bet.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={cn('text-sm font-medium',
                        Number(bet.actualWin || 0) > 0 ? 'text-green-600' : 'text-red-600')}>
                        {bet.status === 'WON' ? '+' : '-'}{formatCurrency(Number(bet.actualWin || bet.amount || 0))}
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
