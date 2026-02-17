'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { matchService } from '@/services/match.service';
import { betService } from '@/services/bet.service';
import { formatCurrency, formatDate } from '@/lib/utils';
import { showToast } from '@/components/Toast';
import Navbar from '@/components/Navbar';

type BetSide = 'BACK' | 'LAY';

interface BetSlip {
  betType: string;
  betOn: string;
  side: BetSide;
  odds: string;
  amount: string;
  label: string;
}

export default function MatchDetailPage() {
  const router = useRouter();
  const params = useParams();
  const matchId = params.id as string;
  const { isAuthenticated, user, updateBalance } = useAuthStore();

  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [betSlip, setBetSlip] = useState<BetSlip | null>(null);
  const [betLoading, setBetLoading] = useState(false);
  const [delayCountdown, setDelayCountdown] = useState(0);
  const [delayTotal, setDelayTotal] = useState(0);
  const [activeTab, setActiveTab] = useState<'matched' | 'fancy'>('matched');
  const [suspended, setSuspended] = useState(false);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    loadMatch();
    // Poll for live updates
    pollRef.current = setInterval(loadMatch, 10000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [isAuthenticated, matchId]);

  const loadMatch = async () => {
    try {
      const res = await matchService.getMatchById(matchId);
      const data = (res as any).data || (res as any);
      setMatch(data);
      // Check if match is suspended (between overs, drinks break, etc.)
      setSuspended(data.status === 'LIVE' && data.metadata?.suspended === true);
    } catch (error) {
      console.error('Failed to load match:', error);
      showToast({ type: 'error', title: 'Error', message: 'Failed to load match details' });
    } finally {
      setLoading(false);
    }
  };

  const openBetSlip = (betType: string, betOn: string, side: BetSide, odds: string, label: string) => {
    if (suspended) {
      showToast({ type: 'error', title: 'Suspended', message: 'Betting is currently suspended for this market' });
      return;
    }
    setBetSlip({ betType, betOn, side, odds, amount: '', label });
  };

  const handlePlaceBet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!betSlip || !match) return;

    setBetLoading(true);
    try {
      const res = await betService.placeBet({
        matchId: match.id,
        betType: betSlip.betType,
        betOn: betSlip.betOn,
        amount: parseFloat(betSlip.amount),
        odds: parseFloat(betSlip.odds),
      });

      const data = res as any;

      if (data.delay && data.delay > 0) {
        setDelayTotal(data.delay);
        setDelayCountdown(data.delay);
        showToast({
          type: 'info',
          title: 'Bet Processing',
          message: `Verifying odds stability for ${data.delay}s...`,
          duration: (data.delay + 1) * 1000,
        });
        const interval = setInterval(() => {
          setDelayCountdown((prev) => {
            if (prev <= 1) { clearInterval(interval); return 0; }
            return prev - 1;
          });
        }, 1000);
        countdownRef.current = interval;
      }

      showToast({
        type: 'success',
        title: 'Bet Placed!',
        message: `${betSlip.label} - ${formatCurrency(parseFloat(betSlip.amount))} @ ${betSlip.odds}`,
      });

      setBetSlip(null);
      if (data.data?.newBalance !== undefined) {
        updateBalance(data.data.newBalance);
      } else if (data.newBalance !== undefined) {
        updateBalance(data.newBalance);
      }
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'Bet Failed',
        message: error.response?.data?.message || 'Failed to place bet',
      });
    } finally {
      setBetLoading(false);
      setDelayCountdown(0);
      setDelayTotal(0);
    }
  };

  const quickAmounts = [100, 500, 1000, 5000, 10000, 25000, 50000];

  // Generate odds for display (simulated bookmaker odds)
  const generateOdds = (team: string) => {
    // In a real app, odds come from the backend/API
    const baseOdd = team === match?.team1 ? 1.85 : 2.05;
    return {
      back: [
        (baseOdd - 0.02).toFixed(2),
        (baseOdd).toFixed(2),
        (baseOdd + 0.02).toFixed(2),
      ],
      lay: [
        (baseOdd + 0.03).toFixed(2),
        (baseOdd + 0.05).toFixed(2),
        (baseOdd + 0.07).toFixed(2),
      ],
    };
  };

  // Fancy/session markets
  const fancyMarkets = [
    { name: '6 Over Runs', no: { odds: '35', rate: '100' }, yes: { odds: '36', rate: '100' } },
    { name: '10 Over Runs', no: { odds: '65', rate: '100' }, yes: { odds: '66', rate: '100' } },
    { name: '20 Over Runs', no: { odds: '130', rate: '100' }, yes: { odds: '132', rate: '100' } },
    { name: `${match?.team1 || 'Team 1'} Boundaries`, no: { odds: '8', rate: '100' }, yes: { odds: '9', rate: '100' } },
    { name: '1st Wicket Runs', no: { odds: '25', rate: '100' }, yes: { odds: '27', rate: '100' } },
    { name: 'Total Match Sixes', no: { odds: '12', rate: '100' }, yes: { odds: '13', rate: '100' } },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-4xl mx-auto px-3 sm:px-4 py-4">
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-500">Loading match...</div>
        </main>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-4xl mx-auto px-3 sm:px-4 py-4">
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
            <p className="text-gray-500">Match not found</p>
            <button onClick={() => router.push('/matches')} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
              Back to Matches
            </button>
          </div>
        </main>
      </div>
    );
  }

  const isLive = match.status === 'LIVE';
  const isUpcoming = match.status === 'UPCOMING';
  const canBet = isLive || isUpcoming;
  const team1Odds = generateOdds(match.team1);
  const team2Odds = generateOdds(match.team2);
  const drawOdds = match.matchType === 'TEST' ? generateOdds('Draw') : null;

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      <main className="max-w-4xl mx-auto px-2 sm:px-4 py-3 sm:py-4 space-y-3">
        {/* Match Header */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {/* Status Bar */}
          <div className={`px-4 py-2 flex items-center justify-between ${
            isLive ? 'bg-red-600' : isUpcoming ? 'bg-blue-600' : 'bg-gray-600'
          }`}>
            <div className="flex items-center gap-2">
              {isLive && <span className="w-2 h-2 bg-white rounded-full animate-pulse" />}
              <span className="text-white text-xs font-bold tracking-wider uppercase">
                {isLive ? 'INPLAY' : match.status}
              </span>
            </div>
            <span className="text-white/80 text-xs">{match.matchType}</span>
          </div>

          <div className="p-4">
            <p className="text-xs text-gray-500 mb-2">{match.tournament}</p>
            <div className="flex items-center justify-between">
              <div className="flex-1 text-center">
                <h3 className="font-bold text-base sm:text-lg text-gray-900">{match.team1}</h3>
                {match.team1Score && (
                  <p className="text-sm text-blue-600 font-semibold mt-1">{match.team1Score}</p>
                )}
              </div>
              <div className="px-4">
                <span className="text-gray-400 font-bold text-lg">vs</span>
              </div>
              <div className="flex-1 text-center">
                <h3 className="font-bold text-base sm:text-lg text-gray-900">{match.team2}</h3>
                {match.team2Score && (
                  <p className="text-sm text-blue-600 font-semibold mt-1">{match.team2Score}</p>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
              <span>{match.venue}{match.city ? `, ${match.city}` : ''}</span>
              <span>{formatDate(match.startTime)}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        {canBet && (
          <div className="flex bg-white rounded-xl shadow-sm border overflow-hidden">
            <button
              onClick={() => setActiveTab('matched')}
              className={`flex-1 py-2.5 text-sm font-medium transition ${
                activeTab === 'matched' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Match Odds
            </button>
            <button
              onClick={() => setActiveTab('fancy')}
              className={`flex-1 py-2.5 text-sm font-medium transition ${
                activeTab === 'fancy' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Fancy / Session
            </button>
          </div>
        )}

        {/* Bookmaker / Match Odds Section */}
        {canBet && activeTab === 'matched' && (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden relative">
            {/* SUSPENDED Overlay */}
            {suspended && (
              <div className="absolute inset-0 bg-black/60 z-10 flex items-center justify-center rounded-xl">
                <div className="bg-red-600 text-white px-6 py-3 rounded-lg text-lg font-bold tracking-wider animate-pulse">
                  SUSPENDED
                </div>
              </div>
            )}

            {/* Header */}
            <div className="bg-gray-800 px-4 py-2.5 flex items-center justify-between">
              <span className="text-white text-sm font-semibold">Match Odds</span>
              <div className="flex gap-1">
                <span className="bg-blue-400/20 text-blue-300 px-3 py-0.5 rounded text-[10px] font-bold uppercase">Back</span>
                <span className="bg-pink-400/20 text-pink-300 px-3 py-0.5 rounded text-[10px] font-bold uppercase">Lay</span>
              </div>
            </div>

            {/* Odds Grid */}
            <div className="divide-y">
              {/* Team 1 */}
              <div className="flex items-center px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{match.team1}</p>
                </div>
                <div className="flex gap-1">
                  {team1Odds.back.map((odd, i) => (
                    <button
                      key={`b1-${i}`}
                      onClick={() => openBetSlip('MATCH_WINNER', match.team1, 'BACK', odd, `${match.team1} (Back)`)}
                      className={`w-14 sm:w-16 py-2 rounded text-xs font-bold transition ${
                        i === 1 ? 'bg-blue-200 hover:bg-blue-300 text-blue-900' : 'bg-blue-100 hover:bg-blue-200 text-blue-800'
                      }`}
                    >
                      {odd}
                    </button>
                  ))}
                  {team1Odds.lay.map((odd, i) => (
                    <button
                      key={`l1-${i}`}
                      onClick={() => openBetSlip('MATCH_WINNER', match.team1, 'LAY', odd, `${match.team1} (Lay)`)}
                      className={`w-14 sm:w-16 py-2 rounded text-xs font-bold transition ${
                        i === 0 ? 'bg-pink-200 hover:bg-pink-300 text-pink-900' : 'bg-pink-100 hover:bg-pink-200 text-pink-800'
                      }`}
                    >
                      {odd}
                    </button>
                  ))}
                </div>
              </div>

              {/* Team 2 */}
              <div className="flex items-center px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{match.team2}</p>
                </div>
                <div className="flex gap-1">
                  {team2Odds.back.map((odd, i) => (
                    <button
                      key={`b2-${i}`}
                      onClick={() => openBetSlip('MATCH_WINNER', match.team2, 'BACK', odd, `${match.team2} (Back)`)}
                      className={`w-14 sm:w-16 py-2 rounded text-xs font-bold transition ${
                        i === 1 ? 'bg-blue-200 hover:bg-blue-300 text-blue-900' : 'bg-blue-100 hover:bg-blue-200 text-blue-800'
                      }`}
                    >
                      {odd}
                    </button>
                  ))}
                  {team2Odds.lay.map((odd, i) => (
                    <button
                      key={`l2-${i}`}
                      onClick={() => openBetSlip('MATCH_WINNER', match.team2, 'LAY', odd, `${match.team2} (Lay)`)}
                      className={`w-14 sm:w-16 py-2 rounded text-xs font-bold transition ${
                        i === 0 ? 'bg-pink-200 hover:bg-pink-300 text-pink-900' : 'bg-pink-100 hover:bg-pink-200 text-pink-800'
                      }`}
                    >
                      {odd}
                    </button>
                  ))}
                </div>
              </div>

              {/* Draw (for TEST matches) */}
              {drawOdds && (
                <div className="flex items-center px-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">Draw</p>
                  </div>
                  <div className="flex gap-1">
                    {drawOdds.back.map((odd, i) => (
                      <button
                        key={`bd-${i}`}
                        onClick={() => openBetSlip('MATCH_WINNER', 'Draw', 'BACK', odd, 'Draw (Back)')}
                        className={`w-14 sm:w-16 py-2 rounded text-xs font-bold transition ${
                          i === 1 ? 'bg-blue-200 hover:bg-blue-300 text-blue-900' : 'bg-blue-100 hover:bg-blue-200 text-blue-800'
                        }`}
                      >
                        {odd}
                      </button>
                    ))}
                    {drawOdds.lay.map((odd, i) => (
                      <button
                        key={`ld-${i}`}
                        onClick={() => openBetSlip('MATCH_WINNER', 'Draw', 'LAY', odd, 'Draw (Lay)')}
                        className={`w-14 sm:w-16 py-2 rounded text-xs font-bold transition ${
                          i === 0 ? 'bg-pink-200 hover:bg-pink-300 text-pink-900' : 'bg-pink-100 hover:bg-pink-200 text-pink-800'
                        }`}
                      >
                        {odd}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bookmaker Section */}
            <div className="border-t">
              <div className="bg-emerald-800 px-4 py-2.5 flex items-center justify-between">
                <span className="text-white text-sm font-semibold">Bookmaker</span>
                <div className="flex gap-1">
                  <span className="bg-blue-400/20 text-blue-300 px-3 py-0.5 rounded text-[10px] font-bold uppercase">Back</span>
                  <span className="bg-pink-400/20 text-pink-300 px-3 py-0.5 rounded text-[10px] font-bold uppercase">Lay</span>
                </div>
              </div>

              <div className="divide-y relative">
                {suspended && (
                  <div className="absolute inset-0 bg-black/60 z-10 flex items-center justify-center">
                    <span className="bg-red-600 text-white px-4 py-1.5 rounded text-sm font-bold animate-pulse">SUSPENDED</span>
                  </div>
                )}
                {/* Team 1 Bookmaker */}
                <div className="flex items-center px-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{match.team1}</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openBetSlip('TOTAL_RUNS', match.team1, 'BACK', '48', `${match.team1} Bookmaker (Back)`)}
                      className="w-14 sm:w-16 py-2 rounded text-xs font-bold bg-blue-200 hover:bg-blue-300 text-blue-900 transition"
                    >
                      48
                    </button>
                    <button
                      onClick={() => openBetSlip('TOTAL_RUNS', match.team1, 'LAY', '50', `${match.team1} Bookmaker (Lay)`)}
                      className="w-14 sm:w-16 py-2 rounded text-xs font-bold bg-pink-200 hover:bg-pink-300 text-pink-900 transition"
                    >
                      50
                    </button>
                  </div>
                </div>
                {/* Team 2 Bookmaker */}
                <div className="flex items-center px-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{match.team2}</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openBetSlip('TOTAL_RUNS', match.team2, 'BACK', '52', `${match.team2} Bookmaker (Back)`)}
                      className="w-14 sm:w-16 py-2 rounded text-xs font-bold bg-blue-200 hover:bg-blue-300 text-blue-900 transition"
                    >
                      52
                    </button>
                    <button
                      onClick={() => openBetSlip('TOTAL_RUNS', match.team2, 'LAY', '54', `${match.team2} Bookmaker (Lay)`)}
                      className="w-14 sm:w-16 py-2 rounded text-xs font-bold bg-pink-200 hover:bg-pink-300 text-pink-900 transition"
                    >
                      54
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Fancy / Session Section */}
        {canBet && activeTab === 'fancy' && (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden relative">
            {suspended && (
              <div className="absolute inset-0 bg-black/60 z-10 flex items-center justify-center rounded-xl">
                <div className="bg-red-600 text-white px-6 py-3 rounded-lg text-lg font-bold tracking-wider animate-pulse">
                  SUSPENDED
                </div>
              </div>
            )}

            <div className="bg-purple-800 px-4 py-2.5 flex items-center justify-between">
              <span className="text-white text-sm font-semibold">Fancy / Session</span>
              <div className="flex gap-1">
                <span className="bg-pink-400/20 text-pink-300 px-3 py-0.5 rounded text-[10px] font-bold uppercase">No</span>
                <span className="bg-blue-400/20 text-blue-300 px-3 py-0.5 rounded text-[10px] font-bold uppercase">Yes</span>
              </div>
            </div>

            <div className="divide-y">
              {fancyMarkets.map((market, idx) => (
                <div key={idx} className="flex items-center px-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{market.name}</p>
                    <p className="text-[10px] text-gray-400">Min: 100 | Max: 50,000</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openBetSlip('SESSION', `${market.name} NO`, 'LAY', market.no.odds, `${market.name} (No)`)}
                      className="w-16 sm:w-20 py-2 rounded text-center bg-pink-200 hover:bg-pink-300 transition"
                    >
                      <div className="text-xs font-bold text-pink-900">{market.no.odds}</div>
                      <div className="text-[9px] text-pink-700">{market.no.rate}</div>
                    </button>
                    <button
                      onClick={() => openBetSlip('SESSION', `${market.name} YES`, 'BACK', market.yes.odds, `${market.name} (Yes)`)}
                      className="w-16 sm:w-20 py-2 rounded text-center bg-blue-200 hover:bg-blue-300 transition"
                    >
                      <div className="text-xs font-bold text-blue-900">{market.yes.odds}</div>
                      <div className="text-[9px] text-blue-700">{market.yes.rate}</div>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed match info */}
        {match.status === 'COMPLETED' && (
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-1">Match Result</p>
              {match.matchWinner ? (
                <p className="text-lg font-bold text-green-700">{match.matchWinner} won</p>
              ) : (
                <p className="text-lg font-bold text-gray-700">Match Completed</p>
              )}
              {match.winMargin && <p className="text-sm text-gray-500 mt-1">by {match.winMargin}</p>}
            </div>
          </div>
        )}

        {/* Match Bets Summary */}
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-900">Bets on this Match</h4>
            <span className="text-xs text-gray-500">{match.totalBetsCount} bets</span>
          </div>
          <div className="text-xs text-gray-500">
            Total Volume: {formatCurrency(Number(match.totalBetsAmount || 0))}
          </div>
        </div>
      </main>

      {/* Bet Slip Modal - Top popup */}
      {betSlip && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-3 sm:pt-6 px-3" onClick={() => setBetSlip(null)}>
          <div
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-slide-down max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`sticky top-0 rounded-t-2xl p-4 border-b z-10 ${
              betSlip.side === 'BACK' ? 'bg-blue-50' : 'bg-pink-50'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      betSlip.side === 'BACK' ? 'bg-blue-200 text-blue-800' : 'bg-pink-200 text-pink-800'
                    }`}>
                      {betSlip.side}
                    </span>
                    <h3 className="text-base font-bold text-gray-900">{betSlip.label}</h3>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{match.team1} vs {match.team2}</p>
                </div>
                <button
                  onClick={() => setBetSlip(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handlePlaceBet} className="p-4 space-y-3">
              {/* Odds & Amount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Odds</label>
                  <input
                    type="number"
                    value={betSlip.odds}
                    onChange={(e) => setBetSlip({ ...betSlip, odds: e.target.value })}
                    step="0.01"
                    min="1"
                    required
                    className="w-full px-3 py-2.5 border rounded-lg text-sm font-bold text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Amount (Stake)</label>
                  <input
                    type="number"
                    value={betSlip.amount}
                    onChange={(e) => setBetSlip({ ...betSlip, amount: e.target.value })}
                    placeholder="Min 100"
                    min="10"
                    required
                    className="w-full px-3 py-2.5 border rounded-lg text-sm font-bold text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Quick Amount */}
              <div className="flex flex-wrap gap-1.5">
                {quickAmounts.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setBetSlip({ ...betSlip, amount: amt.toString() })}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-medium border transition ${
                      betSlip.amount === amt.toString()
                        ? 'bg-blue-100 text-blue-700 border-blue-300'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {amt >= 1000 ? `${amt / 1000}K` : amt}
                  </button>
                ))}
              </div>

              {/* Profit/Loss info */}
              {betSlip.amount && betSlip.odds && (
                <div className={`p-3 rounded-lg border ${
                  betSlip.side === 'BACK' ? 'bg-blue-50 border-blue-100' : 'bg-pink-50 border-pink-100'
                }`}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      {betSlip.side === 'BACK' ? 'Profit' : 'Liability'}
                    </span>
                    <span className={`font-bold ${betSlip.side === 'BACK' ? 'text-green-700' : 'text-red-700'}`}>
                      {betSlip.side === 'BACK'
                        ? formatCurrency(parseFloat(betSlip.amount) * (parseFloat(betSlip.odds) - 1))
                        : formatCurrency(parseFloat(betSlip.amount) * (parseFloat(betSlip.odds) - 1))
                      }
                    </span>
                  </div>
                </div>
              )}

              {/* Delay Countdown */}
              {delayCountdown > 0 && (
                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-yellow-600 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span className="text-sm text-yellow-700 font-medium">Verifying odds... {delayCountdown}s</span>
                  </div>
                  <div className="w-full bg-yellow-200 rounded-full h-1.5">
                    <div className="bg-yellow-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${(delayCountdown / delayTotal) * 100}%` }} />
                  </div>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={betLoading || !betSlip.amount || !betSlip.odds}
                className={`w-full py-3.5 rounded-xl font-semibold text-sm text-white transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                  betSlip.side === 'BACK'
                    ? 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
                    : 'bg-pink-600 hover:bg-pink-700 active:bg-pink-800'
                }`}
              >
                {betLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Placing...
                  </span>
                ) : (
                  `Place ${betSlip.side} Bet`
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
