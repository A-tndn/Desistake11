'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { matchService } from '@/services/match.service';
import { useSocket } from '@/hooks/useSocket';
import BookmakerSection from '@/components/betting/BookmakerSection';
import FancySection from '@/components/betting/FancySection';
import BetHistoryTabs from '@/components/betting/BetHistoryTabs';
import InplayIndicator from '@/components/betting/InplayIndicator';
import BetSlip from '@/components/betting/BetSlip';
// LiveScoreCard removed - score info shown in header
import { formatDate } from '@/lib/utils';
import { MapPin, Clock, Trophy, RefreshCw, Tv, X } from 'lucide-react';

export default function MatchDetailPage() {
  const params = useParams();
  const matchId = params.id as string;
  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showLiveTV, setShowLiveTV] = useState(false);
  const { joinMatch, leaveMatch } = useSocket();

  const refreshIntervalRef = useRef(15000);

  // Adaptive refresh: 8s for LIVE, 30s for non-live
  useEffect(() => {
    if (match?.status === 'LIVE') {
      refreshIntervalRef.current = 8000;
    } else {
      refreshIntervalRef.current = 30000;
    }
  }, [match?.status]);

  useEffect(() => {
    loadMatch();
    joinMatch(matchId);

    let timer: ReturnType<typeof setTimeout>;
    const scheduleRefresh = () => {
      timer = setTimeout(async () => {
        await loadMatch();
        scheduleRefresh();
      }, refreshIntervalRef.current);
    };
    scheduleRefresh();

    return () => {
      leaveMatch(matchId);
      clearTimeout(timer);
    };
  }, [matchId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onOddsUpdated = (e: Event) => {
      const data = (e as CustomEvent).detail;
      if (data?.matchId === matchId) {
        setMatch((prev: any) => prev ? { ...prev, ...data } : prev);
      }
    };

    const onFancyUpdated = (e: Event) => {
      const data = (e as CustomEvent).detail;
      if (data?.matchId === matchId && data.market) {
        setMatch((prev: any) => {
          if (!prev) return prev;
          const markets = (prev.fancyMarkets || []).map((m: any) =>
            m.id === data.market.id ? data.market : m
          );
          return { ...prev, fancyMarkets: markets };
        });
      }
    };

    const onFancyNew = (e: Event) => {
      const data = (e as CustomEvent).detail;
      if (data?.matchId === matchId && data.market) {
        setMatch((prev: any) => {
          if (!prev) return prev;
          return { ...prev, fancyMarkets: [...(prev.fancyMarkets || []), data.market] };
        });
      }
    };

    const onFancySuspended = (e: Event) => {
      const data = (e as CustomEvent).detail;
      if (data?.matchId === matchId) {
        setMatch((prev: any) => {
          if (!prev) return prev;
          const markets = (prev.fancyMarkets || []).map((m: any) =>
            m.id === data.marketId ? { ...m, isSuspended: data.isSuspended } : m
          );
          return { ...prev, fancyMarkets: markets };
        });
      }
    };

    const onAllFancySuspended = (e: Event) => {
      const data = (e as CustomEvent).detail;
      if (data?.matchId === matchId) {
        setMatch((prev: any) => {
          if (!prev) return prev;
          const markets = (prev.fancyMarkets || []).map((m: any) => ({
            ...m, isSuspended: data.isSuspended,
          }));
          return { ...prev, fancyMarkets: markets };
        });
      }
    };

    const onBookmakerSuspended = (e: Event) => {
      const data = (e as CustomEvent).detail;
      if (data?.matchId === matchId) {
        setMatch((prev: any) => prev ? { ...prev, bookmakerSuspended: data.isSuspended } : prev);
      }
    };

    const onBookmakerUpdated = (e: Event) => {
      const data = (e as CustomEvent).detail;
      if (data?.matchId === matchId) {
        setMatch((prev: any) => prev ? {
          ...prev,
          bookmakerSuspended: data.bookmakerSuspended,
          metadata: { ...(prev.metadata || {}), bookmakerOdds: data.bookmakerOdds },
        } : prev);
      }
    };

    const onFancyBulkUpdate = (e: any) => {
      setMatch((prev: any) => prev ? { ...prev, fancyMarkets: e.detail } : prev);
    };

    window.addEventListener('fancy:bulk-update', onFancyBulkUpdate);
    window.addEventListener('fancy:updated', onFancyUpdated);
    window.addEventListener('fancy:new', onFancyNew);
    window.addEventListener('fancy:suspended', onFancySuspended);
    window.addEventListener('fancy:all-suspended', onAllFancySuspended);
    window.addEventListener('bookmaker:suspended', onBookmakerSuspended);
    window.addEventListener('bookmaker:updated', onBookmakerUpdated);

    return () => {
      window.removeEventListener('fancy:bulk-update', onFancyBulkUpdate);
      window.removeEventListener('fancy:updated', onFancyUpdated);
      window.removeEventListener('fancy:new', onFancyNew);
      window.removeEventListener('fancy:suspended', onFancySuspended);
      window.removeEventListener('fancy:all-suspended', onAllFancySuspended);
      window.removeEventListener('bookmaker:suspended', onBookmakerSuspended);
      window.removeEventListener('bookmaker:updated', onBookmakerUpdated);
    };
  }, [matchId]);

  const loadMatch = async () => {
    try {
      const res: any = await matchService.getMatchById(matchId);
      setMatch(res?.data || res);
    } catch (err) {
      console.error('Failed to load match', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMatch();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-4 space-y-3">
        <div className="bg-card rounded-lg h-32 animate-pulse" />
        <div className="bg-card rounded-lg h-40 animate-pulse" />
        <div className="bg-card rounded-lg h-48 animate-pulse" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="max-w-3xl mx-auto p-4 text-center text-muted-foreground">
        Match not found
      </div>
    );
  }

  const isLive = match.status === 'LIVE';
  const locked = match.bettingLocked || match.status === 'COMPLETED' || match.status === 'CANCELLED';
  const streamUrl = match.streamUrl || match.liveStreamUrl;

  return (
    <div className="max-w-3xl mx-auto pb-20">
      {/* BetSlip at top */}
      <BetSlip />

      {/* Match Header */}
      <div className="bg-brand-teal-dark text-white">
        <div className="px-4 pt-3 pb-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-medium">{match.matchType}</span>
            {match.tournament && (
              <span className="text-[10px] text-white/60 flex items-center gap-1">
                <Trophy className="w-3 h-3" />{match.tournament}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isLive && (
              <button
                onClick={() => setShowLiveTV(!showLiveTV)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition ${
                  showLiveTV
                    ? 'bg-red-500 text-white'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                <Tv className="w-3 h-3" />
                LIVE TV
              </button>
            )}
            {isLive && <InplayIndicator className="text-white [&_span]:text-white" />}
            <button
              onClick={handleRefresh}
              className="p-1 hover:bg-white/10 rounded transition"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Live TV Panel */}
        {showLiveTV && isLive && (
          <div className="px-4 pb-2">
            <div className="bg-black rounded-lg overflow-hidden relative">
              {streamUrl ? (
                <div className="aspect-video">
                  <iframe
                    src={streamUrl}
                    className="w-full h-full"
                    allowFullScreen
                    allow="autoplay; encrypted-media"
                  />
                </div>
              ) : (
                <div className="aspect-video flex items-center justify-center">
                  <div className="text-center">
                    <Tv className="w-10 h-10 text-white/30 mx-auto mb-2" />
                    <p className="text-white/50 text-xs">Live stream not available</p>
                    <p className="text-white/30 text-[10px] mt-1">Stream URL to be configured by admin</p>
                  </div>
                </div>
              )}
              <button
                onClick={() => setShowLiveTV(false)}
                className="absolute top-2 right-2 p-1 bg-black/50 rounded-full hover:bg-black/80 transition"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        )}

        {/* Score section */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-base font-bold leading-tight">{match.team1}</p>
              {match.team1Score && (
                <p className="text-lg font-bold text-brand-orange mt-0.5">{match.team1Score}</p>
              )}
            </div>
            <div className="px-4 text-center">
              <span className="text-xs text-white/40 font-medium">VS</span>
            </div>
            <div className="flex-1 text-right">
              <p className="text-base font-bold leading-tight">{match.team2}</p>
              {match.team2Score && (
                <p className="text-lg font-bold text-brand-orange mt-0.5">{match.team2Score}</p>
              )}
            </div>
          </div>
        </div>

        {/* Last 6 Balls + CRR/RRR - only for LIVE matches */}
        {isLive && (match.recentBalls?.length > 0 || match.runRate || match.requiredRunRate) && (
          <div className="px-4 pb-2">
            <div className="flex items-center justify-between">
              {/* Last 6 balls */}
              {match.recentBalls?.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-white/40 font-medium mr-0.5">LAST 6:</span>
                  {(match.recentBalls as string[]).slice(-6).map((ball: string, i: number) => {
                    const b = ball.trim();
                    const color = b === 'W' || b === 'w' ? 'bg-red-500 text-white'
                      : b === '4' ? 'bg-blue-500 text-white'
                      : b === '6' ? 'bg-green-500 text-white'
                      : b === '0' || b === '.' ? 'bg-white/10 text-white/60'
                      : (b.includes('wd') || b.includes('nb')) ? 'bg-yellow-500/80 text-black'
                      : 'bg-white/20 text-white';
                    return (
                      <span key={i} className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${color}`}>
                        {b}
                      </span>
                    );
                  })}
                </div>
              )}
              {/* CRR / RRR */}
              <div className="flex items-center gap-2">
                {match.runRate && (
                  <span className="text-[10px] bg-white/10 text-white/80 px-1.5 py-0.5 rounded font-medium">
                    CRR {match.runRate}
                  </span>
                )}
                {match.requiredRunRate && (
                  <span className="text-[10px] bg-brand-orange/20 text-brand-orange px-1.5 py-0.5 rounded font-medium">
                    RRR {match.requiredRunRate}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Status text */}
        {isLive && match.statusText && (
          <div className="px-4 pb-2">
            <div className="bg-black/20 rounded px-3 py-1">
              <p className="text-[11px] text-yellow-400 font-medium text-center">{match.statusText}</p>
            </div>
          </div>
        )}

        {/* Info row */}
        <div className="px-4 pb-3 flex items-center gap-4 text-[10px] text-white/50">
          {match.venue && match.venue !== 'TBA' && (
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{match.venue}</span>
          )}
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(match.startTime)}</span>
          {!isLive && match.status !== 'COMPLETED' && (
            <span className="text-white/40">{match.status}</span>
          )}
        </div>
      </div>

      {/* Content sections */}
      <div className="p-3 space-y-3">
        <BookmakerSection match={match} locked={locked} />
        <FancySection
          matchId={match.id}
          matchName={match.name}
          markets={(match.fancyMarkets || []).filter((m: any) =>
            (m.noValue != null || m.yesValue != null || m.isSuspended) && !m.isSettled
          )}
          locked={locked}
        />
        <BetHistoryTabs matchId={match.id} />

        {locked && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center text-sm text-yellow-700">
            {match.status === 'COMPLETED' ? 'This match has ended' :
             match.status === 'CANCELLED' ? 'This match was cancelled' :
             'Betting is currently locked for this match'}
          </div>
        )}
      </div>
    </div>
  );
}
