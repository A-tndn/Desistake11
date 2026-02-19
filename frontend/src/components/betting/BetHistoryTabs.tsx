'use client';

import { useEffect, useState } from 'react';
import { betService } from '@/services/bet.service';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface BetHistoryTabsProps {
  matchId: string;
}

export default function BetHistoryTabs({ matchId }: BetHistoryTabsProps) {
  const [activeTab, setActiveTab] = useState<'matched' | 'fancy'>('matched');
  const [bets, setBets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadBets();
  }, [matchId]);

  const loadBets = async () => {
    setLoading(true);
    try {
      const res: any = await betService.getUserBets({ matchId, limit: 50 });
      const allBets = res?.data?.bets || res?.bets || [];
      setBets(allBets);
    } catch (err) {
      console.error('Failed to load bets', err);
    } finally {
      setLoading(false);
    }
  };

  const matchedBets = bets.filter((b: any) => b.betType === 'MATCH_WINNER');
  const fancyBets = bets.filter((b: any) => b.betType === 'FANCY' || b.betType === 'SESSION');

  const currentBets = activeTab === 'matched' ? matchedBets : fancyBets;

  return (
    <div className="bg-card rounded-lg border overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('matched')}
          className={cn(
            'flex-1 py-2.5 text-xs font-bold text-center transition-all',
            activeTab === 'matched'
              ? 'bg-brand-teal text-white'
              : 'bg-muted text-muted-foreground hover:bg-muted/70'
          )}
        >
          MATCHED BET ({matchedBets.length})
        </button>
        <button
          onClick={() => setActiveTab('fancy')}
          className={cn(
            'flex-1 py-2.5 text-xs font-bold text-center transition-all',
            activeTab === 'fancy'
              ? 'bg-brand-teal text-white'
              : 'bg-muted text-muted-foreground hover:bg-muted/70'
          )}
        >
          FANCY BET ({fancyBets.length})
        </button>
      </div>

      {/* Bet list */}
      <div className="max-h-60 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
        ) : currentBets.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No {activeTab === 'matched' ? 'matched' : 'fancy'} bets yet
          </div>
        ) : (
          <div className="divide-y">
            {currentBets.map((bet: any) => (
              <div key={bet.id} className="px-4 py-2.5 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'text-[10px] font-bold px-1.5 py-0.5 rounded',
                      bet.isBack
                        ? 'bg-back text-blue-800'
                        : 'bg-lay text-red-800'
                    )}>
                      {bet.betType === 'MATCH_WINNER'
                        ? (bet.isBack ? 'LAGAI' : 'KHAI')
                        : (bet.isBack ? 'YES' : 'NO')
                      }
                    </span>
                    <span className="text-xs font-medium text-foreground truncate">
                      {bet.description || bet.betOn}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground">
                    <span>Rate: {Number(bet.odds).toFixed(2)}</span>
                    <span>Amt: {formatCurrency(Number(bet.amount))}</span>
                  </div>
                </div>
                <div className="text-right ml-2">
                  <span className={cn(
                    'text-[10px] font-bold px-1.5 py-0.5 rounded',
                    bet.status === 'WON' && 'bg-green-100 text-green-700',
                    bet.status === 'LOST' && 'bg-red-100 text-red-700',
                    bet.status === 'PENDING' && 'bg-yellow-100 text-yellow-700',
                    bet.status === 'VOID' && 'bg-gray-100 text-gray-700',
                  )}>
                    {bet.status}
                  </span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {bet.status === 'WON'
                      ? `+${formatCurrency(Number(bet.actualWin || 0))}`
                      : formatCurrency(Number(bet.potentialWin || 0))
                    }
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
