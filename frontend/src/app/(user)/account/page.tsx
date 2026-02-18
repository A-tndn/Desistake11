'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { betService } from '@/services/bet.service';
import { useAuthStore } from '@/store/authStore';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import {
  FileText, Search, RotateCcw, ChevronLeft, ChevronRight,
  ArrowDownCircle, ArrowUpCircle, Gamepad2, Trophy, RefreshCw,
  Wallet, TrendingUp, TrendingDown, BarChart3, ChevronDown,
} from 'lucide-react';

type TransactionType = '' | 'BET_PLACED' | 'BET_WON' | 'BET_LOST' | 'BET_REFUND'
  | 'CREDIT_TRANSFER' | 'DEBIT_TRANSFER' | 'DEPOSIT' | 'WITHDRAWAL'
  | 'COMMISSION_EARNED' | 'ADJUSTMENT' | 'SETTLEMENT_PAYOUT';

type ViewTab = 'statement' | 'pnl';

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: string; category: string }> = {
  BET_PLACED: { label: 'Bet Placed', color: 'text-orange-600', icon: '🎯', category: 'Betting' },
  BET_WON: { label: 'Bet Won', color: 'text-green-600', icon: '🏆', category: 'Betting' },
  BET_LOST: { label: 'Bet Lost', color: 'text-red-600', icon: '❌', category: 'Betting' },
  BET_REFUND: { label: 'Bet Refund', color: 'text-blue-600', icon: '↩️', category: 'Betting' },
  CREDIT_TRANSFER: { label: 'Credit Received', color: 'text-green-600', icon: '💰', category: 'Agent' },
  DEBIT_TRANSFER: { label: 'Credit Deducted', color: 'text-red-600', icon: '💸', category: 'Agent' },
  DEPOSIT: { label: 'Deposit', color: 'text-green-600', icon: '⬇️', category: 'Finance' },
  WITHDRAWAL: { label: 'Withdrawal', color: 'text-red-600', icon: '⬆️', category: 'Finance' },
  COMMISSION_EARNED: { label: 'Commission', color: 'text-purple-600', icon: '💎', category: 'Finance' },
  ADJUSTMENT: { label: 'Adjustment', color: 'text-amber-600', icon: '⚙️', category: 'Finance' },
  SETTLEMENT_PAYOUT: { label: 'Settlement', color: 'text-blue-600', icon: '📋', category: 'Finance' },
};

const FILTER_OPTIONS: { label: string; value: TransactionType; }[] = [
  { label: 'All', value: '' },
  { label: 'Bet Won', value: 'BET_WON' },
  { label: 'Bet Lost', value: 'BET_LOST' },
  { label: 'Bet Placed', value: 'BET_PLACED' },
  { label: 'Credit In', value: 'CREDIT_TRANSFER' },
  { label: 'Credit Out', value: 'DEBIT_TRANSFER' },
  { label: 'Deposit', value: 'DEPOSIT' },
  { label: 'Withdrawal', value: 'WITHDRAWAL' },
];

export default function AccountStatementPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<ViewTab>('statement');

  // Statement state
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<TransactionType>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const pageSize = 30;

  // P&L state
  const [bets, setBets] = useState<any[]>([]);
  const [pnlLoading, setPnlLoading] = useState(true);

  // Pre-fill dates: last 7 days
  useEffect(() => {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    setFromDate(weekAgo.toISOString().split('T')[0]);
    setToDate(now.toISOString().split('T')[0]);
  }, []);

  // Load statement data when filters change
  useEffect(() => {
    if (fromDate && toDate) {
      loadData();
    }
  }, [page, fromDate, toDate, typeFilter]);

  // Load P&L data on mount
  useEffect(() => {
    loadPnlData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: pageSize };
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;
      if (typeFilter) params.type = typeFilter;

      const res: any = await api.get('/bets/account-statement', { params });
      const data = res?.data;
      if (data) {
        setTransactions(data.transactions || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalRecords(data.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Failed to load account statement', err);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const loadPnlData = async () => {
    setPnlLoading(true);
    try {
      const res: any = await betService.getUserBets({ limit: 100 });
      const data = res?.data?.bets || res?.bets || res?.data || [];
      setBets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load P&L', err);
    } finally {
      setPnlLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadData();
  };

  const handleReset = () => {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    setFromDate(weekAgo.toISOString().split('T')[0]);
    setToDate(now.toISOString().split('T')[0]);
    setTypeFilter('');
    setPage(1);
  };

  // Statement summary from displayed transactions
  const totalCredit = transactions
    .filter((t: any) => ['BET_WON', 'CREDIT_TRANSFER', 'DEPOSIT', 'BET_REFUND', 'COMMISSION_EARNED', 'SETTLEMENT_PAYOUT'].includes(t.type))
    .reduce((sum: number, t: any) => sum + parseFloat(t.amount || 0), 0);
  const totalDebit = transactions
    .filter((t: any) => ['BET_PLACED', 'BET_LOST', 'DEBIT_TRANSFER', 'WITHDRAWAL'].includes(t.type))
    .reduce((sum: number, t: any) => sum + parseFloat(t.amount || 0), 0);
  const netAmount = totalCredit - totalDebit;

  const isCredit = (type: string) => ['BET_WON', 'CREDIT_TRANSFER', 'DEPOSIT', 'BET_REFUND', 'COMMISSION_EARNED', 'SETTLEMENT_PAYOUT'].includes(type);

  // P&L calculations
  const settled = bets.filter((b: any) => b.status === 'WON' || b.status === 'LOST');
  const totalStaked = settled.reduce((sum: number, b: any) => sum + parseFloat(b.amount), 0);
  const totalWon = settled.filter((b: any) => b.status === 'WON').reduce((sum: number, b: any) => sum + parseFloat(b.actualWin || 0), 0);
  const netPnL = totalWon - totalStaked;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="px-3 py-3">
        <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
          <FileText className="w-5 h-5 text-brand-teal" />
          Account Statement
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Transactions, balance changes & P&L overview
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="px-3 mb-3">
        <div className="flex gap-1 bg-muted rounded-lg p-0.5">
          <button
            onClick={() => setActiveTab('statement')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all',
              activeTab === 'statement'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <FileText className="w-3.5 h-3.5" />
            Statement
          </button>
          <button
            onClick={() => setActiveTab('pnl')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all',
              activeTab === 'pnl'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            P&L Ledger
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* STATEMENT TAB */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'statement' && (
        <>
          {/* Date Range & Filters */}
          <div className="px-3 mb-3">
            <div className="bg-card rounded-lg border p-3 space-y-3">
              <div className="flex flex-wrap gap-2 items-end">
                <div className="flex-1 min-w-[110px]">
                  <label className="block text-[10px] text-muted-foreground mb-1 font-medium">From Date</label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 border rounded-lg text-xs bg-background"
                  />
                </div>
                <div className="flex-1 min-w-[110px]">
                  <label className="block text-[10px] text-muted-foreground mb-1 font-medium">To Date</label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 border rounded-lg text-xs bg-background"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  className="px-3 py-1.5 bg-brand-teal text-white rounded-lg text-xs font-medium flex items-center gap-1 hover:bg-brand-teal/90 transition"
                >
                  <Search className="w-3 h-3" /> Search
                </button>
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 bg-muted text-foreground rounded-lg text-xs font-medium flex items-center gap-1 hover:bg-muted/80 transition"
                >
                  <RotateCcw className="w-3 h-3" /> Reset
                </button>
              </div>

              {/* Type filter chips */}
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
                {FILTER_OPTIONS.map((ft) => (
                  <button
                    key={ft.value}
                    onClick={() => { setTypeFilter(ft.value); setPage(1); }}
                    className={cn(
                      'px-2.5 py-1 rounded-full text-[11px] font-medium border transition whitespace-nowrap',
                      typeFilter === ft.value
                        ? 'bg-brand-teal text-white border-brand-teal'
                        : 'bg-background text-muted-foreground border-border hover:bg-muted'
                    )}
                  >
                    {ft.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-2 px-3 mb-3">
            <div className="bg-card rounded-lg border p-2.5 text-center">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <TrendingUp className="w-3 h-3 text-green-500" />
                <p className="text-[10px] text-muted-foreground">Credit</p>
              </div>
              <p className="text-sm font-bold text-green-600">{formatCurrency(totalCredit)}</p>
            </div>
            <div className="bg-card rounded-lg border p-2.5 text-center">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <TrendingDown className="w-3 h-3 text-red-500" />
                <p className="text-[10px] text-muted-foreground">Debit</p>
              </div>
              <p className="text-sm font-bold text-red-600">{formatCurrency(totalDebit)}</p>
            </div>
            <div className="bg-card rounded-lg border p-2.5 text-center">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <Wallet className="w-3 h-3 text-brand-teal" />
                <p className="text-[10px] text-muted-foreground">Net</p>
              </div>
              <p className={cn('text-sm font-bold', netAmount >= 0 ? 'text-green-600' : 'text-red-600')}>
                {netAmount >= 0 ? '+' : ''}{formatCurrency(netAmount)}
              </p>
            </div>
          </div>

          {/* Records count */}
          <div className="px-3 mb-2">
            <p className="text-[11px] text-muted-foreground">{totalRecords} records found</p>
          </div>

          {/* Transaction List */}
          <div className="px-3 pb-4">
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="bg-card rounded-lg border h-16 animate-pulse" />
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No transactions found for this period
              </div>
            ) : (
              <div className="space-y-1.5">
                {transactions.map((txn: any) => {
                  const config = TYPE_CONFIG[txn.type] || { label: txn.type, color: 'text-foreground', icon: '📄', category: 'Other' };
                  const credit = isCredit(txn.type);
                  const amount = parseFloat(txn.amount || 0);
                  const balanceAfter = parseFloat(txn.balanceAfter || 0);

                  return (
                    <div key={txn.id} className="bg-card rounded-lg border px-3 py-2.5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-2 min-w-0 flex-1">
                          <span className="text-base mt-0.5">{config.icon}</span>
                          <div className="min-w-0">
                            <p className={cn('text-sm font-medium', config.color)}>
                              {config.label}
                            </p>
                            {txn.description && (
                              <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                                {txn.description}
                              </p>
                            )}
                            <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                              {formatDate(txn.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <p className={cn('text-sm font-bold', credit ? 'text-green-600' : 'text-red-600')}>
                            {credit ? '+' : '-'}{formatCurrency(amount)}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Bal: {formatCurrency(balanceAfter)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded bg-muted hover:bg-muted/70 disabled:opacity-50 transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded bg-muted hover:bg-muted/70 disabled:opacity-50 transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* P&L LEDGER TAB */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'pnl' && (
        <>
          {/* P&L Summary Cards */}
          <div className="grid grid-cols-2 gap-2 px-3 mb-3">
            <div className="bg-card rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Current Balance</p>
              <p className="text-lg font-bold text-brand-teal">{formatCurrency(user?.balance || 0)}</p>
            </div>
            <div className="bg-card rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Net P&L</p>
              <p className={cn('text-lg font-bold', netPnL >= 0 ? 'text-green-600' : 'text-red-600')}>
                {netPnL >= 0 ? '+' : ''}{formatCurrency(netPnL)}
              </p>
            </div>
            <div className="bg-card rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Total Staked</p>
              <p className="text-lg font-bold text-foreground">{formatCurrency(totalStaked)}</p>
            </div>
            <div className="bg-card rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Total Won</p>
              <p className="text-lg font-bold text-green-600">{formatCurrency(totalWon)}</p>
            </div>
          </div>

          {/* Recent activity */}
          <div className="px-3 pb-4">
            <h2 className="text-sm font-semibold text-foreground mb-2">Recent Activity</h2>
            {pnlLoading ? (
              <div className="bg-card rounded-lg border h-40 animate-pulse" />
            ) : settled.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">No activity yet</div>
            ) : (
              <div className="space-y-1.5">
                {settled.slice(0, 30).map((bet: any) => {
                  const pnl = bet.status === 'WON' ? parseFloat(bet.actualWin || 0) - parseFloat(bet.amount) : -parseFloat(bet.amount);
                  return (
                    <div key={bet.id} className="bg-card rounded-lg border px-3 py-2 flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm text-foreground truncate">{bet.match?.name || bet.betOn}</p>
                        <p className="text-[10px] text-muted-foreground/70">{formatDate(bet.settledAt || bet.createdAt)}</p>
                      </div>
                      <span className={cn('text-sm font-semibold whitespace-nowrap', pnl >= 0 ? 'text-green-600' : 'text-red-600')}>
                        {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
