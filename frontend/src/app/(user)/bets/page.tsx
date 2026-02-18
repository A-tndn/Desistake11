'use client';

import { useEffect, useState } from 'react';
import { betService } from '@/services/bet.service';
import { casinoService } from '@/services/casino.service';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { ScrollText, Gamepad2, Trophy, Filter } from 'lucide-react';

const STATUS_FILTERS = ['all', 'PENDING', 'WON', 'LOST', 'VOID'];
const SOURCE_FILTERS = ['all', 'sports', 'casino'];

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  WON: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  LOST: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  VOID: 'bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400',
  CANCELLED: 'bg-gray-100 text-gray-500 dark:bg-gray-800/50 dark:text-gray-500',
};

interface UnifiedBet {
  id: string;
  source: 'sports' | 'casino';
  matchName: string;
  description: string;
  amount: number;
  odds: number;
  status: string;
  pnl: number;
  isBack?: boolean;
  actualWin?: number;
  createdAt: string;
  gameName?: string;
  betType?: string;
}

export default function BetsPage() {
  const [sportsBets, setSportsBets] = useState<any[]>([]);
  const [casinoBets, setCasinoBets] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllBets();
  }, []);

  const loadAllBets = async () => {
    setLoading(true);
    try {
      const [sportsRes, casinoRes] = await Promise.all([
        betService.getUserBets({ limit: 100 }).catch(() => null),
        casinoService.getBetHistory({ limit: 100 }).catch(() => null),
      ]);

      // Parse sports bets
      const sData = sportsRes?.data?.bets || sportsRes?.bets || sportsRes?.data || [];
      setSportsBets(Array.isArray(sData) ? sData : []);

      // Parse casino bets
      const cData = casinoRes?.data?.bets || casinoRes?.bets || casinoRes?.data || [];
      setCasinoBets(Array.isArray(cData) ? cData : []);
    } catch (err) {
      console.error('Failed to load bets', err);
    } finally {
      setLoading(false);
    }
  };

  // Unify bets into a single list
  const unifiedBets: UnifiedBet[] = [
    ...sportsBets.map((bet: any) => {
      const amount = parseFloat(bet.amount || 0);
      const actualWin = parseFloat(bet.actualWin || 0);
      let pnl = 0;
      if (bet.status === 'WON') pnl = actualWin - amount;
      else if (bet.status === 'LOST') pnl = -amount;

      return {
        id: bet.id,
        source: 'sports' as const,
        matchName: bet.match?.name || bet.matchId || 'Unknown Match',
        description: bet.betType === 'FANCY' && bet.fancyMarket
          ? `${bet.fancyMarket.marketName} - ${bet.betOn?.startsWith('YES') ? 'YES' : 'NO'} ${bet.betOn?.split('_')[1] || ''}`
          : bet.description || `${(bet.betType || '').replace('_', ' ')} - ${bet.betOn || ''}`,
        amount,
        odds: parseFloat(bet.odds || 0),
        status: bet.status,
        pnl,
        isBack: bet.isBack,
        actualWin,
        createdAt: bet.createdAt,
        betType: bet.betType,
      };
    }),
    ...casinoBets.map((bet: any) => {
      const amount = parseFloat(bet.amount || 0);
      const actualWin = parseFloat(bet.actualWin || 0);
      let pnl = 0;
      if (bet.status === 'WON') pnl = actualWin - amount;
      else if (bet.status === 'LOST') pnl = -amount;

      return {
        id: bet.id,
        source: 'casino' as const,
        matchName: bet.round?.game?.gameName || 'Casino Game',
        description: `${bet.betType} bet`,
        amount,
        odds: parseFloat(bet.odds || 0),
        status: bet.status,
        pnl,
        actualWin,
        createdAt: bet.createdAt,
        gameName: bet.round?.game?.gameName,
        betType: bet.betType,
      };
    }),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Apply filters
  const filteredBets = unifiedBets.filter((bet) => {
    if (statusFilter !== 'all' && bet.status !== statusFilter) return false;
    if (sourceFilter !== 'all' && bet.source !== sourceFilter) return false;
    return true;
  });

  // Summary stats
  const totalBets = filteredBets.length;
  const totalStaked = filteredBets.reduce((s, b) => s + b.amount, 0);
  const netPnl = filteredBets
    .filter(b => b.status === 'WON' || b.status === 'LOST')
    .reduce((s, b) => s + b.pnl, 0);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="px-3 py-3">
        <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
          <ScrollText className="w-5 h-5 text-brand-teal" />
          My Bets
        </h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2 px-3 mb-3">
        <div className="bg-card rounded-lg border p-2.5 text-center">
          <p className="text-[10px] text-muted-foreground">Total Bets</p>
          <p className="text-sm font-bold text-foreground">{totalBets}</p>
        </div>
        <div className="bg-card rounded-lg border p-2.5 text-center">
          <p className="text-[10px] text-muted-foreground">Total Staked</p>
          <p className="text-sm font-bold text-foreground">{formatCurrency(totalStaked)}</p>
        </div>
        <div className="bg-card rounded-lg border p-2.5 text-center">
          <p className="text-[10px] text-muted-foreground">Net P&L</p>
          <p className={cn('text-sm font-bold', netPnl >= 0 ? 'text-green-600' : 'text-red-600')}>
            {netPnl >= 0 ? '+' : ''}{formatCurrency(netPnl)}
          </p>
        </div>
      </div>

      {/* Source Filter */}
      <div className="flex gap-1.5 px-3 pb-2">
        {SOURCE_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setSourceFilter(f)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition border',
              sourceFilter === f
                ? 'bg-brand-teal text-white border-brand-teal'
                : 'bg-card text-muted-foreground border-border hover:bg-muted'
            )}
          >
            {f === 'all' && <Filter className="w-3 h-3" />}
            {f === 'sports' && <Trophy className="w-3 h-3" />}
            {f === 'casino' && <Gamepad2 className="w-3 h-3" />}
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Status Filter */}
      <div className="flex gap-1 px-3 pb-2 overflow-x-auto scrollbar-hide">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition',
              statusFilter === f
                ? 'bg-brand-orange text-white'
                : 'bg-card text-muted-foreground border hover:bg-muted'
            )}
          >
            {f === 'all' ? 'All Status' : f}
          </button>
        ))}
      </div>

      {/* Bets list */}
      <div className="px-3 pb-4 space-y-2">
        {loading ? (
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card rounded-lg border h-20 animate-pulse" />
          ))
        ) : filteredBets.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">No bets found</div>
        ) : (
          filteredBets.map((bet) => (
            <div key={bet.id} className="bg-card rounded-lg border p-3">
              <div className="flex items-start justify-between mb-1.5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {bet.source === 'casino' ? (
                      <Gamepad2 className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                    ) : (
                      <Trophy className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                    )}
                    <p className="text-sm font-medium text-foreground truncate">
                      {bet.matchName}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground pl-5 truncate">
                    {bet.description}
                  </p>
                </div>
                <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full ml-2 flex-shrink-0', statusColors[bet.status] || 'bg-muted')}>
                  {bet.status}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground pl-5">
                <div className="flex items-center gap-3">
                  <span>Stake: <strong className="text-foreground">{formatCurrency(bet.amount)}</strong></span>
                  <span>Odds: <strong className="text-foreground">{bet.odds.toFixed(2)}</strong></span>
                  {bet.source === 'sports' && bet.isBack !== undefined && (
                    <span className={cn(bet.isBack ? 'text-blue-600' : 'text-pink-600', 'font-medium')}>
                      {bet.isBack ? 'BACK' : 'LAY'}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground/60">{formatDate(bet.createdAt)}</span>
              </div>
              {(bet.status === 'WON' || bet.status === 'LOST') && (
                <div className="mt-1.5 pt-1.5 border-t border-border/50 pl-5">
                  <span className={cn('text-xs font-semibold', bet.pnl >= 0 ? 'text-green-600' : 'text-red-600')}>
                    P&L: {bet.pnl >= 0 ? '+' : ''}{formatCurrency(bet.pnl)}
                  </span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
