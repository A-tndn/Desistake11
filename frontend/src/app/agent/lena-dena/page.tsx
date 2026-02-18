'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { agentService } from '@/services/agent.service';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import {
  Loader2, Search, RotateCcw, Users, Handshake,
  ArrowDownLeft, ArrowUpRight, ChevronDown, ChevronUp,
  TrendingUp, TrendingDown, Wallet, Calendar,
  CheckCircle2, XCircle, CreditCard,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Player {
  id: string;
  username: string;
  displayName: string;
  balance: number;
}

interface ClientSettlement {
  playerId: string;
  playerName: string;
  username: string;
  balance: number;
  totalCreditGiven: number;     // total coins given (CREDIT_TRANSFER to player)
  totalCreditTaken: number;     // total coins taken back (DEBIT_TRANSFER from player)
  totalBetsPlaced: number;
  totalWon: number;
  totalLost: number;
  netPnl: number;               // from player's perspective: won - staked
  netSettlement: number;         // what agent needs to COLLECT (positive) or PAY (negative)
  transactions: any[];
}

// ─── Searchable Client Selector ─────────────────────────────────────────────

function ClientSelector({ players, value, onChange, loading }: {
  players: Player[];
  value: string;
  onChange: (v: string) => void;
  loading: boolean;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredPlayers = useMemo(() => {
    if (!searchTerm.trim()) return players;
    const q = searchTerm.toLowerCase();
    return players.filter(
      (p) => p.displayName.toLowerCase().includes(q) || p.username.toLowerCase().includes(q)
    );
  }, [players, searchTerm]);

  const selectedPlayer = players.find((p) => p.id === value);
  const displayText = selectedPlayer
    ? `${selectedPlayer.displayName} (@${selectedPlayer.username})`
    : 'All Clients';

  if (loading) {
    return (
      <div className="flex h-10 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading clients...
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          !value && 'text-muted-foreground'
        )}
      >
        <span className="truncate">{displayText}</span>
        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-md border border-border bg-card shadow-lg">
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search clients..."
                  className="w-full rounded-md border border-input bg-background py-1.5 pl-8 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  autoFocus
                />
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto p-1">
              {/* All option */}
              <button
                onClick={() => { onChange(''); setIsOpen(false); setSearchTerm(''); }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted',
                  !value && 'bg-muted font-medium'
                )}
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground text-[10px] font-semibold">
                  <Users className="w-3 h-3" />
                </div>
                <span className="text-foreground">All Clients</span>
              </button>

              {filteredPlayers.map((player) => (
                <button
                  key={player.id}
                  onClick={() => {
                    onChange(player.id);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted',
                    value === player.id && 'bg-muted font-medium'
                  )}
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-teal/10 text-brand-teal text-[10px] font-semibold">
                    {player.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left flex-1">
                    <span className="text-foreground">{player.displayName}</span>
                    <span className="ml-1 text-xs text-muted-foreground">@{player.username}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatCurrency(player.balance)}</span>
                </button>
              ))}

              {filteredPlayers.length === 0 && (
                <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                  No clients found
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function LenaDenaPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  // Players list
  const [players, setPlayers] = useState<Player[]>([]);
  const [playersLoading, setPlayersLoading] = useState(true);

  // Filter state
  const [selectedClient, setSelectedClient] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Settlement data
  const [settlements, setSettlements] = useState<ClientSettlement[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    if (!isAuthenticated || user?.type !== 'agent') {
      router.push('/login');
      return;
    }
    loadPlayers();
  }, [isAuthenticated, user, router]);

  // Default dates: last 7 days
  useEffect(() => {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    setFromDate(weekAgo.toISOString().split('T')[0]);
    setToDate(now.toISOString().split('T')[0]);
  }, []);

  const loadPlayers = async () => {
    setPlayersLoading(true);
    try {
      const res = await agentService.getPlayers();
      const data = (res as any).data || [];
      setPlayers(
        data.map((p: any) => ({
          id: p.id,
          username: p.username,
          displayName: p.displayName,
          balance: Number(p.balance || 0),
        }))
      );
    } catch {
      console.error('Failed to load players');
    } finally {
      setPlayersLoading(false);
    }
  };

  const handleSearch = useCallback(async () => {
    setLoading(true);
    setHasSearched(true);
    try {
      const filters: any = {};
      if (selectedClient) filters.playerId = selectedClient;
      if (fromDate) filters.from = fromDate;
      if (toDate) filters.to = toDate;

      const res = await agentService.getClientLedgerFiltered(filters);
      const data = (res as any).data;

      // Backend returns { ledger: [...], totals: {...} }
      const ledgerArray = data?.ledger || data?.entries || [];
      if (ledgerArray.length > 0) {
        const mapped: ClientSettlement[] = ledgerArray.map((entry: any) => ({
          playerId: entry.playerId || entry.id,
          playerName: entry.displayName || entry.playerName || entry.username,
          username: entry.username || '',
          balance: Number(entry.balance || 0),
          totalCreditGiven: Number(entry.totalStaked || 0),   // total coins player staked
          totalCreditTaken: Number(entry.totalWonByPlayer || 0), // total winnings paid out
          totalBetsPlaced: Number(entry.totalBets || entry.totalStaked || 0),
          totalWon: Number(entry.totalWonByPlayer || 0),
          totalLost: Number(entry.totalLostByPlayer || 0),
          netPnl: Number(entry.netPnl || 0),                 // from agent perspective: +ve = agent gains
          netSettlement: Number(entry.netAfterCommission || entry.netPnl || 0),
          transactions: entry.transactions || [],
        }));
        setSettlements(mapped);
      } else {
        setSettlements([]);
      }
    } catch (err) {
      console.error('Failed to load settlement data:', err);
      setSettlements([]);
    } finally {
      setLoading(false);
    }
  }, [selectedClient, fromDate, toDate]);

  const handleReset = () => {
    setSelectedClient('');
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    setFromDate(weekAgo.toISOString().split('T')[0]);
    setToDate(now.toISOString().split('T')[0]);
    setSettlements([]);
    setHasSearched(false);
    setExpandedRow(null);
  };

  // Calculate totals
  const totals = useMemo(() => {
    return settlements.reduce(
      (acc, s) => ({
        totalCreditGiven: acc.totalCreditGiven + s.totalCreditGiven,
        totalCreditTaken: acc.totalCreditTaken + s.totalCreditTaken,
        totalWon: acc.totalWon + s.totalWon,
        totalLost: acc.totalLost + s.totalLost,
        netPnl: acc.netPnl + s.netPnl,
        netSettlement: acc.netSettlement + s.netSettlement,
        totalBalance: acc.totalBalance + s.balance,
      }),
      { totalCreditGiven: 0, totalCreditTaken: 0, totalWon: 0, totalLost: 0, netPnl: 0, netSettlement: 0, totalBalance: 0 }
    );
  }, [settlements]);

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-7xl px-4 py-6">
        {/* Page Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Handshake className="w-6 h-6 text-brand-teal" />
            Lena Dena
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Track credit given to players, their P&L, and settlement amounts
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 rounded-lg border border-border bg-card p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="grid gap-1.5 sm:min-w-[240px]">
              <label className="text-xs text-muted-foreground font-medium">Select Client</label>
              <ClientSelector
                players={players}
                value={selectedClient}
                onChange={setSelectedClient}
                loading={playersLoading}
              />
            </div>
            <div className="grid gap-1.5 min-w-[140px]">
              <label className="text-xs text-muted-foreground font-medium">From Date</label>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background pl-8 pr-3 text-sm"
                />
              </div>
            </div>
            <div className="grid gap-1.5 min-w-[140px]">
              <label className="text-xs text-muted-foreground font-medium">To Date</label>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background pl-8 pr-3 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSearch}
                disabled={loading}
                className="h-10 px-4 bg-brand-teal hover:bg-brand-teal/90 text-white rounded-md text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Search
              </button>
              <button
                onClick={handleReset}
                className="h-10 px-4 border border-input hover:bg-muted rounded-md text-sm font-medium flex items-center gap-2 transition"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="rounded-lg border border-border bg-card flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading settlement data...</span>
          </div>
        )}

        {/* No Search Yet */}
        {!loading && !hasSearched && (
          <div className="rounded-lg border border-border bg-card py-16 text-center">
            <Handshake className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">Click Search to view client settlement data</p>
          </div>
        )}

        {/* No Results */}
        {!loading && hasSearched && settlements.length === 0 && (
          <div className="rounded-lg border border-border bg-card py-16 text-center">
            <Handshake className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">No settlement data found for this period</p>
          </div>
        )}

        {/* Results */}
        {!loading && hasSearched && settlements.length > 0 && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-1">
                  <ArrowUpRight className="w-4 h-4 text-green-500" />
                  <p className="text-xs text-muted-foreground">Credit Given (Diya)</p>
                </div>
                <p className="text-lg font-bold text-green-600">{formatCurrency(totals.totalCreditGiven)}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-1">
                  <ArrowDownLeft className="w-4 h-4 text-red-500" />
                  <p className="text-xs text-muted-foreground">Credit Taken (Liya)</p>
                </div>
                <p className="text-lg font-bold text-red-600">{formatCurrency(totals.totalCreditTaken)}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                  <p className="text-xs text-muted-foreground">Players Won</p>
                </div>
                <p className="text-lg font-bold text-blue-600">{formatCurrency(totals.totalWon)}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown className="w-4 h-4 text-amber-500" />
                  <p className="text-xs text-muted-foreground">Players Lost</p>
                </div>
                <p className="text-lg font-bold text-amber-600">{formatCurrency(totals.totalLost)}</p>
              </div>
            </div>

            {/* Net Settlement Banner */}
            <div className={cn(
              'rounded-lg border-2 p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-3',
              totals.netSettlement > 0
                ? 'border-green-500/30 bg-green-50 dark:bg-green-950/30'
                : totals.netSettlement < 0
                  ? 'border-red-500/30 bg-red-50 dark:bg-red-950/30'
                  : 'border-border bg-muted'
            )}>
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center',
                  totals.netSettlement > 0 ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'
                )}>
                  {totals.netSettlement >= 0
                    ? <ArrowDownLeft className="w-5 h-5 text-green-600" />
                    : <ArrowUpRight className="w-5 h-5 text-red-600" />
                  }
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Net Settlement</p>
                  <p className="text-xs text-muted-foreground">
                    {totals.netSettlement > 0
                      ? 'You need to COLLECT from players'
                      : totals.netSettlement < 0
                        ? 'You need to PAY to players'
                        : 'All settled'}
                  </p>
                </div>
              </div>
              <p className={cn(
                'text-2xl font-bold',
                totals.netSettlement > 0 ? 'text-green-600' : totals.netSettlement < 0 ? 'text-red-600' : 'text-foreground'
              )}>
                {totals.netSettlement > 0 ? '+' : ''}{formatCurrency(Math.abs(totals.netSettlement))}
              </p>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block rounded-lg border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-900 text-white">
                      <th className="px-3 py-2.5 text-left text-xs font-semibold">#</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold">Client</th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold">Balance</th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold text-green-400">Credit Given</th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold text-red-400">Credit Taken</th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold text-blue-400">Won</th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold text-amber-400">Lost</th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold">Net P&L</th>
                      <th className="px-3 py-2.5 text-center text-xs font-semibold">Settlement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {settlements.map((s, idx) => (
                      <tr
                        key={s.playerId}
                        className="hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => setExpandedRow(expandedRow === s.playerId ? null : s.playerId)}
                      >
                        <td className="px-3 py-2.5 text-sm text-muted-foreground">{idx + 1}</td>
                        <td className="px-3 py-2.5">
                          <p className="text-sm font-medium text-foreground">{s.playerName}</p>
                          <p className="text-[11px] text-muted-foreground">@{s.username}</p>
                        </td>
                        <td className="px-3 py-2.5 text-right text-sm font-medium text-foreground">
                          {formatCurrency(s.balance)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-sm font-medium text-green-600">
                          {formatCurrency(s.totalCreditGiven)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-sm font-medium text-red-600">
                          {formatCurrency(s.totalCreditTaken)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-sm font-medium text-blue-600">
                          {formatCurrency(s.totalWon)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-sm font-medium text-amber-600">
                          {formatCurrency(s.totalLost)}
                        </td>
                        <td className={cn('px-3 py-2.5 text-right text-sm font-bold',
                          s.netPnl > 0 ? 'text-green-600' : s.netPnl < 0 ? 'text-red-600' : 'text-foreground'
                        )}>
                          {s.netPnl > 0 ? '+' : ''}{formatCurrency(s.netPnl)}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={cn(
                            'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold',
                            s.netSettlement > 0
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                              : s.netSettlement < 0
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                : 'bg-muted text-muted-foreground'
                          )}>
                            {s.netSettlement > 0 ? (
                              <>
                                <ArrowDownLeft className="w-3 h-3" />
                                Collect {formatCurrency(Math.abs(s.netSettlement))}
                              </>
                            ) : s.netSettlement < 0 ? (
                              <>
                                <ArrowUpRight className="w-3 h-3" />
                                Pay {formatCurrency(Math.abs(s.netSettlement))}
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3 h-3" />
                                Settled
                              </>
                            )}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Totals Footer */}
                  <tfoot>
                    <tr className="border-t-2 border-border bg-muted/70 font-bold">
                      <td className="px-3 py-3 text-sm text-foreground" colSpan={2}>Total ({settlements.length} clients)</td>
                      <td className="px-3 py-3 text-right text-sm text-foreground">{formatCurrency(totals.totalBalance)}</td>
                      <td className="px-3 py-3 text-right text-sm text-green-600">{formatCurrency(totals.totalCreditGiven)}</td>
                      <td className="px-3 py-3 text-right text-sm text-red-600">{formatCurrency(totals.totalCreditTaken)}</td>
                      <td className="px-3 py-3 text-right text-sm text-blue-600">{formatCurrency(totals.totalWon)}</td>
                      <td className="px-3 py-3 text-right text-sm text-amber-600">{formatCurrency(totals.totalLost)}</td>
                      <td className={cn('px-3 py-3 text-right text-sm font-extrabold',
                        totals.netPnl > 0 ? 'text-green-700' : totals.netPnl < 0 ? 'text-red-700' : 'text-foreground'
                      )}>
                        {totals.netPnl > 0 ? '+' : ''}{formatCurrency(totals.netPnl)}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={cn(
                          'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold',
                          totals.netSettlement > 0
                            ? 'bg-green-200 dark:bg-green-900/50 text-green-800 dark:text-green-300'
                            : totals.netSettlement < 0
                              ? 'bg-red-200 dark:bg-red-900/50 text-red-800 dark:text-red-300'
                              : 'bg-muted text-muted-foreground'
                        )}>
                          {totals.netSettlement > 0
                            ? `Collect ${formatCurrency(Math.abs(totals.netSettlement))}`
                            : totals.netSettlement < 0
                              ? `Pay ${formatCurrency(Math.abs(totals.netSettlement))}`
                              : 'All Settled'}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {settlements.map((s, idx) => {
                const isExpanded = expandedRow === s.playerId;
                return (
                  <div
                    key={s.playerId}
                    className="rounded-lg border border-border bg-card overflow-hidden"
                  >
                    {/* Card header */}
                    <button
                      onClick={() => setExpandedRow(isExpanded ? null : s.playerId)}
                      className="w-full p-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-teal/10 text-brand-teal text-xs font-bold">
                          {s.playerName.charAt(0).toUpperCase()}
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium text-foreground">{s.playerName}</p>
                          <p className="text-[11px] text-muted-foreground">@{s.username}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold',
                          s.netSettlement > 0
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : s.netSettlement < 0
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                              : 'bg-muted text-muted-foreground'
                        )}>
                          {s.netSettlement > 0 ? `Collect ${formatCurrency(Math.abs(s.netSettlement))}`
                            : s.netSettlement < 0 ? `Pay ${formatCurrency(Math.abs(s.netSettlement))}`
                              : 'Settled'}
                        </span>
                        {isExpanded
                          ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        }
                      </div>
                    </button>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="border-t border-border px-3 pb-3 pt-2 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-md bg-muted/50 p-2">
                            <p className="text-[10px] text-muted-foreground">Balance</p>
                            <p className="text-sm font-bold text-foreground">{formatCurrency(s.balance)}</p>
                          </div>
                          <div className={cn('rounded-md p-2', s.netPnl >= 0 ? 'bg-green-50 dark:bg-green-950/30' : 'bg-red-50 dark:bg-red-950/30')}>
                            <p className="text-[10px] text-muted-foreground">Net P&L</p>
                            <p className={cn('text-sm font-bold', s.netPnl >= 0 ? 'text-green-600' : 'text-red-600')}>
                              {s.netPnl >= 0 ? '+' : ''}{formatCurrency(s.netPnl)}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-md bg-green-50 dark:bg-green-950/20 p-2">
                            <p className="text-[10px] text-green-600">Credit Given (Diya)</p>
                            <p className="text-sm font-semibold text-green-600">{formatCurrency(s.totalCreditGiven)}</p>
                          </div>
                          <div className="rounded-md bg-red-50 dark:bg-red-950/20 p-2">
                            <p className="text-[10px] text-red-600">Credit Taken (Liya)</p>
                            <p className="text-sm font-semibold text-red-600">{formatCurrency(s.totalCreditTaken)}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-md bg-blue-50 dark:bg-blue-950/20 p-2">
                            <p className="text-[10px] text-blue-600">Won by Player</p>
                            <p className="text-sm font-semibold text-blue-600">{formatCurrency(s.totalWon)}</p>
                          </div>
                          <div className="rounded-md bg-amber-50 dark:bg-amber-950/20 p-2">
                            <p className="text-[10px] text-amber-600">Lost by Player</p>
                            <p className="text-sm font-semibold text-amber-600">{formatCurrency(s.totalLost)}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
