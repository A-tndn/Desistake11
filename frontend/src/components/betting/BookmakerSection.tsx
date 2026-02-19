'use client';

import { cn } from '@/lib/utils';
import { useBetStore } from '@/store/betStore';

interface BookmakerSectionProps {
  match: any;
  locked: boolean;
}

export default function BookmakerSection({ match, locked }: BookmakerSectionProps) {
  const { addToBetSlip } = useBetStore();
  const isSuspended = match.bookmakerSuspended || match.bettingLocked;
  const isDisabled = locked || isSuspended;

  const handleOddsClick = (team: string, odds: number, isBack: boolean) => {
    if (isDisabled) return;
    addToBetSlip({
      matchId: match.id,
      matchName: match.name,
      betType: 'MATCH_WINNER',
      betOn: team,
      odds,
      isBack,
    });
  };

  // Use bookmaker Indian rates if available, otherwise fall back to match odds
  const hasBookmakerOdds = match.bookmakerTeam1Back != null || match.bookmakerTeam1Lay != null ||
                           match.bookmakerTeam2Back != null || match.bookmakerTeam2Lay != null;

  const rows = hasBookmakerOdds
    ? [
        { name: match.team1, backOdds: match.bookmakerTeam1Back, layOdds: match.bookmakerTeam1Lay },
        { name: match.team2, backOdds: match.bookmakerTeam2Back, layOdds: match.bookmakerTeam2Lay },
      ]
    : [
        { name: match.team1, backOdds: match.team1BackOdds, layOdds: match.team1LayOdds },
        ...(match.drawBackOdds || match.drawLayOdds
          ? [{ name: 'Draw', backOdds: match.drawBackOdds, layOdds: match.drawLayOdds }]
          : []),
        { name: match.team2, backOdds: match.team2BackOdds, layOdds: match.team2LayOdds },
      ];

  return (
    <div className="bg-card rounded-lg border overflow-hidden">
      {/* Header */}
      <div className="bg-brand-teal-dark px-4 py-2 flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
          <span className="text-yellow-400">⭐</span> BOOKMAKER
        </h3>
        <div className="flex gap-12 text-[10px] font-bold">
          <span className="text-back-light w-14 text-center">LAGAI</span>
          <span className="text-lay-light w-14 text-center">KHAI</span>
        </div>
      </div>

      {/* Rows */}
      <div>
        {rows.map((row, i) => {
          const backNum = row.backOdds != null ? Number(row.backOdds) : null;
          const layNum = row.layOdds != null ? Number(row.layOdds) : null;
          const hasBack = backNum != null && backNum > 0 && !isNaN(backNum);
          const hasLay = layNum != null && layNum > 0 && !isNaN(layNum);
          const rowSuspended = isSuspended || (!hasBack && !hasLay);

          return (
            <div
              key={row.name}
              className={cn(
                'grid grid-cols-[1fr_120px] items-center px-4 py-2.5',
                i < rows.length - 1 && 'border-b',
                'hover:bg-muted/30 transition'
              )}
            >
              <span className="text-sm font-medium text-foreground truncate pr-2">{row.name}</span>
              <div className="grid grid-cols-2 gap-1.5 relative">
                {/* Back (LAGAI) */}
                <button
                  onClick={!isDisabled && hasBack ? () => handleOddsClick(row.name === 'Draw' ? 'DRAW' : row.name, backNum!, true) : undefined}
                  disabled={isDisabled || !hasBack}
                  className={cn(
                    'py-2 px-1 text-center font-bold text-sm rounded transition-all',
                    'bg-back hover:bg-back-dark text-foreground',
                    (isDisabled || !hasBack) && 'opacity-50 cursor-not-allowed',
                    !isDisabled && hasBack && 'cursor-pointer active:scale-95',
                  )}
                >
                  {hasBack ? backNum! : '-'}
                </button>

                {/* Lay (KHAI) */}
                <button
                  onClick={!isDisabled && hasLay ? () => handleOddsClick(row.name === 'Draw' ? 'DRAW' : row.name, layNum!, false) : undefined}
                  disabled={isDisabled || !hasLay}
                  className={cn(
                    'py-2 px-1 text-center font-bold text-sm rounded transition-all',
                    'bg-lay hover:bg-lay-dark text-foreground',
                    (isDisabled || !hasLay) && 'opacity-50 cursor-not-allowed',
                    !isDisabled && hasLay && 'cursor-pointer active:scale-95',
                  )}
                >
                  {hasLay ? layNum! : '-'}
                </button>

                {/* SUSPENDED text overlay on odds only (not blocking whole page) */}
                {rowSuspended && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-red-600 font-bold text-sm tracking-wider">
                      SUSPENDED
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
