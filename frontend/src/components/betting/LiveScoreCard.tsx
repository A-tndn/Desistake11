'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface LiveScoreCardProps {
  match: any;
}

export default function LiveScoreCard({ match }: LiveScoreCardProps) {
  const [score, setScore] = useState({
    team1Score: match.team1Score || null,
    team2Score: match.team2Score || null,
    statusText: match.statusText || null,
    recentBalls: match.recentBalls || [],
    runRate: match.runRate || null,
    requiredRunRate: match.requiredRunRate || null,
    battingTeam: match.battingTeam || null,
    team1Short: match.team1Short || null,
    team2Short: match.team2Short || null,
  });

  // Listen for real-time score updates
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onScoreUpdate = (e: Event) => {
      const data = (e as CustomEvent).detail;
      if (data?.matchId === match.id) {
        setScore(prev => ({
          team1Score: data.team1Score || prev.team1Score,
          team2Score: data.team2Score || prev.team2Score,
          statusText: data.statusText ?? prev.statusText,
          recentBalls: data.recentBalls || prev.recentBalls,
          runRate: data.runRate ?? prev.runRate,
          requiredRunRate: data.requiredRunRate ?? prev.requiredRunRate,
          battingTeam: data.battingTeam ?? prev.battingTeam,
          team1Short: data.team1Short ?? prev.team1Short,
          team2Short: data.team2Short ?? prev.team2Short,
        }));
      }
    };

    window.addEventListener('score:updated', onScoreUpdate);
    return () => window.removeEventListener('score:updated', onScoreUpdate);
  }, [match.id]);

  // Update when match prop changes
  useEffect(() => {
    setScore(prev => ({
      team1Score: match.team1Score || prev.team1Score,
      team2Score: match.team2Score || prev.team2Score,
      statusText: match.statusText ?? prev.statusText,
      recentBalls: match.recentBalls || prev.recentBalls,
      runRate: match.runRate ?? prev.runRate,
      requiredRunRate: match.requiredRunRate ?? prev.requiredRunRate,
      battingTeam: match.battingTeam ?? prev.battingTeam,
      team1Short: match.team1Short ?? prev.team1Short,
      team2Short: match.team2Short ?? prev.team2Short,
    }));
  }, [match.team1Score, match.team2Score, match.statusText, match.recentBalls, match.runRate, match.requiredRunRate, match.battingTeam]);

  const isLive = match.status === 'LIVE';
  const hasScores = score.team1Score || score.team2Score;

  if (!hasScores && !isLive) return null;

  // Ball color helper
  const getBallColor = (ball: string) => {
    const b = ball.trim();
    if (b === 'W' || b === 'w') return 'bg-red-500 text-white';
    if (b === '4') return 'bg-blue-500 text-white';
    if (b === '6') return 'bg-green-500 text-white';
    if (b === '0' || b === '.') return 'bg-white/10 text-white/60';
    if (b.includes('wd') || b.includes('WD') || b.includes('nb') || b.includes('NB')) return 'bg-yellow-500/80 text-black';
    return 'bg-white/20 text-white';
  };

  const team1Batting = score.battingTeam === 'team1';
  const team2Batting = score.battingTeam === 'team2';

  return (
    <div className="bg-[#1a2c38] rounded-lg border border-white/10 overflow-hidden">
      {/* Live Score Header */}
      <div className="px-4 py-2 bg-[#0d1b24] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-white/80">LIVE SCORE</span>
          {isLive && (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              <span className="text-[10px] text-red-400 font-medium">LIVE</span>
            </span>
          )}
        </div>
        {/* CRR / RRR badges */}
        <div className="flex items-center gap-2">
          {score.runRate && (
            <span className="text-[10px] bg-brand-teal/20 text-brand-teal px-2 py-0.5 rounded font-medium">
              CRR: {score.runRate}
            </span>
          )}
          {score.requiredRunRate && (
            <span className="text-[10px] bg-brand-orange/20 text-brand-orange px-2 py-0.5 rounded font-medium">
              RRR: {score.requiredRunRate}
            </span>
          )}
        </div>
      </div>

      {/* Scores */}
      <div className="px-4 py-3 space-y-2">
        {/* Team 1 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
              team1Batting ? 'bg-brand-teal text-white' : 'bg-brand-teal/20 text-brand-teal'
            )}>
              {match.team1?.[0]}
            </div>
            <span className={cn(
              'text-sm font-semibold truncate',
              team1Batting ? 'text-white' : 'text-white/70'
            )}>
              {score.team1Short || match.team1}
            </span>
            {team1Batting && (
              <span className="w-1 h-1 bg-green-400 rounded-full animate-pulse" />
            )}
          </div>
          <span className={cn(
            'text-sm font-bold tabular-nums ml-2',
            score.team1Score ? (team1Batting ? 'text-brand-orange' : 'text-white') : 'text-white/30'
          )}>
            {score.team1Score || 'Yet to bat'}
          </span>
        </div>

        {/* Team 2 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
              team2Batting ? 'bg-brand-teal text-white' : 'bg-brand-teal/20 text-brand-teal'
            )}>
              {match.team2?.[0]}
            </div>
            <span className={cn(
              'text-sm font-semibold truncate',
              team2Batting ? 'text-white' : 'text-white/70'
            )}>
              {score.team2Short || match.team2}
            </span>
            {team2Batting && (
              <span className="w-1 h-1 bg-green-400 rounded-full animate-pulse" />
            )}
          </div>
          <span className={cn(
            'text-sm font-bold tabular-nums ml-2',
            score.team2Score ? (team2Batting ? 'text-brand-orange' : 'text-white') : 'text-white/30'
          )}>
            {score.team2Score || 'Yet to bat'}
          </span>
        </div>
      </div>

      {/* Recent Balls */}
      {score.recentBalls && score.recentBalls.length > 0 && (
        <div className="px-4 pb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-white/40 font-medium mr-1">BALLS:</span>
            {score.recentBalls.slice(-8).map((ball: string, i: number) => (
              <span
                key={i}
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold',
                  getBallColor(ball)
                )}
              >
                {ball}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Status text (e.g., "ZIM Needed 140 runs from 91 balls") */}
      {score.statusText && (
        <div className="px-4 pb-3">
          <div className="bg-black/20 rounded px-3 py-1.5">
            <p className="text-[11px] text-yellow-400 font-medium text-center">
              {score.statusText}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
