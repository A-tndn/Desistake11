'use client';

import { useEffect, useState, useMemo } from 'react';
import { agentService } from '@/services/agent.service';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { BookOpen, Search, Calendar, RotateCcw } from 'lucide-react';

export default function ClientLedgerPage() {
  const [players, setPlayers] = useState<any[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

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
    } catch (err) { console.error('Failed', err); }
  };

  const filteredPlayers = useMemo(() => {
    if (!searchTerm.trim()) return players;
    const q = searchTerm.toLowerCase();
    return players.filter((p: any) => p.displayName?.toLowerCase().includes(q) || p.username?.toLowerCase().includes(q));
  }, [players, searchTerm]);

  const selectedName = useMemo(() => {
    if (!selectedPlayer) return 'Select a client';
    const p = players.find((p: any) => p.id === selectedPlayer);
    return p ? `${p.displayName} (@${p.username})` : 'Select a client';
  }, [selectedPlayer, players]);

  const handleSearch = async () => {
    if (!selectedPlayer) return;
    setLoading(true);
    setHasSearched(true);
    try {
      const res = await agentService.getAccountStatement({
        userId: selectedPlayer,
        from: fromDate || undefined,
        to: toDate || undefined,
      } as any);
      setEntries((res as any).data || []);
    } catch (err) { console.error('Failed', err); setEntries([]); }
    finally { setLoading(false); }
  };

  const isCredit = (type: string) =>
    ['DEPOSIT', 'BET_WON', 'CREDIT_TRANSFER', 'BET_REFUND'].includes(type);

  return (
    <div>
      <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-4">
        <BookOpen className="w-5 h-5 text-brand-teal" /> Client Ledger
      </h2>

      <div className="mb-4 rounded-lg border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="relative sm:min-w-[260px]">
            <label className="block text-xs text-muted-foreground font-medium mb-1">Select Client</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input type="text" value={showDropdown ? searchTerm : selectedName}
                onChange={(e) => { setSearchTerm(e.target.value); setShowDropdown(true); }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Search clients..."
                className="w-full h-10 pl-8 pr-3 border rounded-md text-sm focus:ring-2 focus:ring-brand-teal outline-none" />
            </div>
            {showDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
                <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-md border bg-card shadow-lg max-h-60 overflow-y-auto">
                  {filteredPlayers.map((p: any) => (
                    <button key={p.id} onClick={() => { setSelectedPlayer(p.id); setShowDropdown(false); setSearchTerm(''); }}
                      className={cn('w-full text-left px-3 py-2 text-sm hover:bg-muted', selectedPlayer === p.id && 'bg-muted font-medium')}>
                      {p.displayName} <span className="text-muted-foreground">@{p.username}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
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
          <button onClick={handleSearch} disabled={loading || !selectedPlayer}
            className="h-10 px-4 bg-brand-teal text-white rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50">
            {loading ? 'Loading...' : 'Search'}
          </button>
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
        {!hasSearched ? (
          <div className="p-12 text-center text-muted-foreground text-sm">Select a client and click Search</div>
        ) : loading ? (
          <div className="p-12 text-center text-muted-foreground text-sm">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">No ledger entries found</div>
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
                {entries.map((t: any, idx: number) => (
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
