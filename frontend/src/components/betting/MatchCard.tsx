'use client';

import { useRouter } from 'next/navigation';
import { useBetStore } from '@/store/betStore';
import { cn } from '@/lib/utils';
import { Tv } from 'lucide-react';

interface MatchCardProps {
  match: {
    id: string;
    name: string;
    shortName?: string;
    team1: string;
    team2: string;
    tournament?: string;
    status: string;
    startTime: string;
    team1Score?: string;
    team2Score?: string;
    team1BackOdds?: number;
    team1LayOdds?: number;
    team2BackOdds?: number;
    team2LayOdds?: number;
    drawBackOdds?: number;
    drawLayOdds?: number;
    bettingLocked?: boolean;
  };
  compact?: boolean;
}

export default function MatchCard({ match, compact = false }: MatchCardProps) {
  const router = useRouter();
  const { addToBetSlip } = useBetStore();
  const isLive = match.status === 'LIVE';
  const locked = match.bettingLocked || match.status === 'COMPLETED' || match.status === 'CANCELLED';

  const handleOddsClick = (e: React.MouseEvent, team: string, odds: number, isBack: boolean) => {
    e.stopPropagation();
    if (locked) return;
    addToBetSlip({
      matchId: match.id,
      matchName: match.name,
      betType: 'MATCH_WINNER',
      betOn: team,
      odds,
      isBack,
    });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    }) + ', ' + d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Build odds array: [team1Back, team1Lay, drawBack, drawLay, team2Back, team2Lay]
  const oddsData = [
    { team: match.team1, odds: match.team1BackOdds, isBack: true },
    { team: match.team1, odds: match.team1LayOdds, isBack: false },
    { team: 'DRAW', odds: match.drawBackOdds, isBack: true },
    { team: 'DRAW', odds: match.drawLayOdds, isBack: false },
    { team: match.team2, odds: match.team2BackOdds, isBack: true },
    { team: match.team2, odds: match.team2LayOdds, isBack: false },
  ];

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 overflow-hidden cursor-pointer hover:shadow-md transition"
      onClick={() => router.push(`/matches/${match.id}`)}
    >
      {/* Date + INPLAY badge + TV */}
      <div className="px-3 pt-2.5 pb-1 flex items-center justify-between">
        <span className="text-xs font-medium text-red-600">
          {formatDate(match.startTime)}
        </span>
        <div className="flex items-center gap-1.5">
          {isLive && (
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-bold text-red-600">INPLAY</span>
            </div>
          )}
          <Tv className="w-4 h-4 text-gray-500" />
        </div>
      </div>

      {/* Match name */}
      <div className="px-3 pb-2">
        <p className="text-sm font-bold text-gray-900 leading-tight">{match.name}</p>
      </div>

      {/* 6 odds boxes in a row: Back/Lay x 3 (team1, draw, team2) */}
      {!compact && (
        <div className="px-2.5 pb-2.5">
          <div className="grid grid-cols-6 gap-1">
            {oddsData.map((item, i) => {
              const numOdds = item.odds != null ? Number(item.odds) : null;
              const hasOdds = numOdds != null && numOdds > 0 && !isNaN(numOdds);
              const isClickable = !locked && hasOdds;

              return (
                <button
                  key={i}
                  onClick={isClickable ? (e) => handleOddsClick(e, item.team, numOdds!, item.isBack) : undefined}
                  disabled={!isClickable}
                  className={cn(
                    'py-2 text-center text-sm font-bold rounded transition-all',
                    item.isBack
                      ? 'bg-back text-foreground hover:bg-back-dark'
                      : 'bg-lay text-foreground hover:bg-lay-dark',
                    !isClickable && 'opacity-60 cursor-default',
                    isClickable && 'cursor-pointer active:scale-95',
                  )}
                >
                  {hasOdds ? numOdds!.toFixed(2) : '-'}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
