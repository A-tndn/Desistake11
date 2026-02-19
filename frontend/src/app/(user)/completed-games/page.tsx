'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { betService } from '@/services/bet.service';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Trophy, ChevronRight } from 'lucide-react';

interface MatchSummary {
  matchId: string;
  matchName: string;
  totalBets: number;
  totalStake: number;
  totalWon: number;
  pnl: number;
  settledAt: string;
}

export default function CompletedGamesPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res: any = await betService.getUserBets({ status: 'WON,LOST', limit: 500 });
      const data = res?.data?.bets || res?.bets || res?.data || [];
      const bets = Array.isArray(data) ? data : [];

      // Group bets by match
      const matchMap = new Map<string, MatchSummary>();
      bets.forEach((bet: any) => {
        const id = bet.matchId || bet.match?.id || 'unknown';
        const name = bet.match?.name || bet.matchName || bet.betOn || 'Unknown Match';
        if (!matchMap.has(id)) {
          matchMap.set(id, {
            matchId: id,
            matchName: name,
            totalBets: 0,
            totalStake: 0,
            totalWon: 0,
            pnl: 0,
            settledAt: bet.settledAt || bet.updatedAt || bet.createdAt,
          });
        }
        const m = matchMap.get(id)!;
        m.totalBets++;
        const amount = Number(bet.amount) || 0;
        const won = bet.status === 'WON' ? Number(bet.actualWin || 0) : 0;
        m.totalStake += amount;
        m.totalWon += won;
        m.pnl += (won - amount);
        // Keep latest date
        const betDate = bet.settledAt || bet.updatedAt || bet.createdAt;
        if (betDate > m.settledAt) m.settledAt = betDate;
      });

      const sorted = Array.from(matchMap.values()).sort(
        (a, b) => new Date(b.settledAt).getTime() - new Date(a.settledAt).getTime()
      );
      setMatches(sorted);
    } catch (err) {
      console.error('Failed to load completed games', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="px-3 py-3">
        <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Trophy className="w-5 h-5 text-brand-teal" />
          Completed Games
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">Match-level P&L summary</p>
      </div>

      <div className="px-3 pb-4">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card rounded-lg border h-20 animate-pulse" />
            ))}
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No completed games yet
          </div>
        ) : (
          <div className="space-y-2">
            {matches.map((m) => (
              <button
                key={m.matchId}
                onClick={() => router.push(`/matches/${m.matchId}`)}
                className="w-full bg-card rounded-lg border p-3 hover:shadow-md transition text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-sm font-medium text-foreground truncate">{m.matchName}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-muted-foreground">
                        {m.totalBets} bet{m.totalBets !== 1 ? 's' : ''}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Staked: {formatCurrency(m.totalStake)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDate(m.settledAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'text-sm font-bold',
                      m.pnl >= 0 ? 'text-green-600' : 'text-red-600'
                    )}>
                      {m.pnl >= 0 ? '+' : ''}{formatCurrency(m.pnl)}
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
