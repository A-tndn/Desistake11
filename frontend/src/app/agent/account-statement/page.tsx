'use client';

import { useEffect, useState, useMemo } from 'react';
import { agentService } from '@/services/agent.service';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { FileText, Search, Calendar, RotateCcw } from 'lucide-react';

export default function AccountStatementPage() {
  const [players, setPlayers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [playersLoading, setPlayersLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    loadPlayers();
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    setFromDate(weekAgo.toISOString().split('T')[0]);
    setToDate(now.toISOString().split('T')[0]);
  }, []);

  const loadPlayers = async () => {
    try {
      const res = await agentService.getPlayers();
      setPlayers((res as any).data || []);
    } catch (err) { console.error('Failed to load players', err); }
    finally { setPlayersLoading(false); }
  };

  const filteredPlayers = useMemo(() => {
    if (!searchTerm.trim()) return players;
    const q = searchTerm.toLowerCase();
    return players.filter(
      (p: any) => p.displayName?.toLowerCase().includes(q) || p.username?.toLowerCase().includes(q)
    );
  }, [players, searchTerm]);

  const selectedPlayerName = useMemo(() => {
    if (!selectedUser) return 'My Account (Agent)';
    const p = players.find((p: any) => p.id === selectedUser);
    return p ? `${p.displayName} (@${p.username})` : 'Select user';
  }, [selectedUser, players]);

  const handleSearch = async () => {
    setLoading(true);
    setHasSearched(true);
    try {
      const res = await agentService.getAccountStatement({
        ...(selectedUser ? { userId: selectedUser } : {}),
        from: fromDate || undefined,
        to: toDate || undefined,
      } as any);
      setTransactions((res as any).data || []);
    } catch (err) { console.error('Failed to load statement', err); }
    finally { setLoading(false); }
  };

  const handleReset = () => {
    setSelectedUser('');
    setSearchTerm('');
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    setFromDate(weekAgo.toISOString().split('T')[0]);
    setToDate(now.toISOString().split('T')[0]);
    setTransactions([]);
    setHasSearched(false);
  };

  const totals = useMemo(() => {
    let credit = 0, debit = 0;
    for (const t of transactions) {
      const amt = Number(t.amount || 0);
      const type = t.type;
      if (['DEPOSIT', 'BET_WON', 'CREDIT_TRANSFER', 'BET_REFUND', 'COMMISSION_EARNED'].includes(type)) {
        credit += amt;
      } else {
        debit += amt;
      }
    }
    return { credit, debit, net: credit - debit };
  }, [transactions]);

  const isCredit = (type: string) =>
    ['DEPOSIT', 'BET_WON', 'CREDIT_TRANSFER', 'BET_REFUND', 'COMMISSION_EARNED'].includes(type);

  return (
    <div>
      <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-4">
        <FileText className="w-5 h-5 text-brand-teal" /> Account Statement
      </h2>

      {/* Filters */}
      <div className="mb-4 rounded-lg border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          {/* User selector with search input */}
          <div className="relative sm:min-w-[260px]">
            <label className="block text-xs text-muted-foreground font-medium mb-1">Select User</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                value={showDropdown ? searchTerm : selectedPlayerName}
                onChange={(e) => { setSearchTerm(e.target.value); setShowDropdown(true); }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Search users..."
                className="w-full h-10 pl-8 pr-3 border rounded-md text-sm focus:ring-2 focus:ring-brand-teal outline-none"
              />
            </div>
            {showDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
                <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-md border bg-card shadow-lg max-h-60 overflow-y-auto">
                  <button onClick={() => { setSelectedUser(''); setShowDropdown(false); setSearchTerm(''); }}
                    className={cn('w-full text-left px-3 py-2 text-sm hover:bg-muted', !selectedUser && 'bg-muted font-medium')}>
                    My Account (Agent)
                  </button>
                  {filteredPlayers.map((p: any) => (
                    <button key={p.id} onClick={() => { setSelectedUser(p.id); setShowDropdown(false); setSearchTerm(''); }}
                      className={cn('w-full text-left px-3 py-2 text-sm hover:bg-muted', selectedUser === p.id && 'bg-muted font-medium')}>
                      {p.displayName} <span className="text-muted-foreground">@{p.username}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="min-w-[140px]">
            <label className="block text-xs text-muted-foreground font-medium mb-1">From Date</label>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
                className="w-full h-10 pl-8 pr-3 border rounded-md text-sm" />
            </div>
          </div>
          <div className="min-w-[140px]">
            <label className="block text-xs text-muted-foreground font-medium mb-1">To Date</label>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
                className="w-full h-10 pl-8 pr-3 border rounded-md text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSearch} disabled={loading}
              className="h-10 px-4 bg-brand-teal text-white rounded-md text-sm font-medium flex items-center gap-2 hover:opacity-90 disabled:opacity-50">
              <Search className="w-4 h-4" /> {loading ? 'Loading...' : 'Search'}
            </button>
            <button onClick={handleReset}
              className="h-10 px-4 border rounded-md text-sm font-medium flex items-center gap-2 hover:bg-muted">
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
          </div>
        </div>
      </div>

      {/* Summary */}
      {hasSearched && transactions.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-card rounded-xl border p-4">
            <p className="text-xs text-muted-foreground">Total Credit</p>
            <p className="text-lg font-bold text-green-600">{formatCurrency(totals.credit)}</p>
          </div>
          <div className="bg-card rounded-xl border p-4">
            <p className="text-xs text-muted-foreground">Total Debit</p>
            <p className="text-lg font-bold text-red-600">{formatCurrency(totals.debit)}</p>
          </div>
          <div className="bg-card rounded-xl border p-4">
            <p className="text-xs text-muted-foreground">Net</p>
            <p className={cn('text-lg font-bold', totals.net >= 0 ? 'text-green-600' : 'text-red-600')}>
              {formatCurrency(totals.net)}
            </p>
          </div>
        </div>
      )}

      {/* Transactions Table */}
      <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
        {!hasSearched ? (
          <div className="p-12 text-center text-muted-foreground text-sm">Click Search to view account statement</div>
        ) : loading ? (
          <div className="p-12 text-center text-muted-foreground text-sm">Loading...</div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">No transactions found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900 text-white">
                <tr>
                  {['Date', 'Type', 'Description', 'User', 'Credit', 'Debit', 'Balance'].map(h => (
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
                    <td className="px-3 py-2 text-xs text-muted-foreground max-w-[200px] truncate">{t.description || '-'}</td>
                    <td className="px-3 py-2 text-xs">{t.user?.displayName || '-'}</td>
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
