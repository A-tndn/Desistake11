'use client';

import { useEffect, useState, useMemo } from 'react';
import { agentService } from '@/services/agent.service';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { ClipboardList, Search, Calendar, RotateCcw } from 'lucide-react';

export default function ReportDetailsPage() {
  const [players, setPlayers] = useState<any[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    loadPlayers();
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 30);
    setFromDate(weekAgo.toISOString().split('T')[0]);
    setToDate(now.toISOString().split('T')[0]);
  }, []);

  const loadPlayers = async () => {
    try {
      const res = await agentService.getPlayers();
      setPlayers((res as any).data || []);
    } catch (err) { console.error('Failed to load players', err); }
  };

  const handleSearch = async () => {
    setLoading(true);
    setHasSearched(true);
    try {
      const res = await agentService.getAccountStatement({
        ...(selectedUser ? { userId: selectedUser } : {}),
        from: fromDate || undefined,
        to: toDate || undefined,
      } as any);
      setData((res as any).data || []);
    } catch (err) { console.error('Failed', err); setData([]); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-4">
        <ClipboardList className="w-5 h-5 text-brand-teal" /> Report Details
      </h2>

      <div className="mb-4 rounded-lg border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="sm:min-w-[200px]">
            <label className="block text-xs text-muted-foreground font-medium mb-1">User</label>
            <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full h-10 px-3 border rounded-md text-sm">
              <option value="">All (Agent Account)</option>
              {players.map((p: any) => (
                <option key={p.id} value={p.id}>{p.displayName} (@{p.username})</option>
              ))}
            </select>
          </div>
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
          <div className="p-12 text-center text-muted-foreground text-sm">Click Search to view report</div>
        ) : loading ? (
          <div className="p-12 text-center text-muted-foreground text-sm">Loading...</div>
        ) : data.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">No data found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900 text-white">
                <tr>
                  {['Date', 'Type', 'Description', 'Amount', 'Balance After'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.map((t: any, idx: number) => (
                  <tr key={t.id || idx} className="hover:bg-muted/30">
                    <td className="px-3 py-2 text-xs text-muted-foreground">{formatDate(t.createdAt)}</td>
                    <td className="px-3 py-2 text-xs font-medium">{t.type?.replace(/_/g, ' ')}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{t.description || '-'}</td>
                    <td className="px-3 py-2 text-sm font-medium">{formatCurrency(Number(t.amount))}</td>
                    <td className="px-3 py-2 text-sm font-medium">{t.balanceAfter ? formatCurrency(Number(t.balanceAfter)) : '-'}</td>
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
