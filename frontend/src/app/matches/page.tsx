'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { matchService } from '@/services/match.service';
import { betService } from '@/services/bet.service';
import { formatCurrency, formatDate } from '@/lib/utils';
import { showToast } from '@/components/Toast';
import Navbar from '@/components/Navbar';

export default function MatchesPage() {
  const router = useRouter();
  const { isAuthenticated, updateBalance } = useAuthStore();
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [betForm, setBetForm] = useState({
    betType: 'MATCH_WINNER',
    betOn: '',
    amount: '',
    odds: '1.8',
  });
  const [betLoading, setBetLoading] = useState(false);
  const [delayCountdown, setDelayCountdown] = useState(0);
  const [delayTotal, setDelayTotal] = useState(0);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    loadMatches();
  }, [isAuthenticated, filter]);

  // Cleanup countdown on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const loadMatches = async () => {
    try {
      const params: any = { limit: 50 };
      if (filter !== 'all') params.status = filter;
      const res = await matchService.getMatches(params);
      setMatches((res as any).data || []);
    } catch (error) {
      console.error('Failed to load matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceBet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatch) return;

    setBetLoading(true);

    try {
      const res = await betService.placeBet({
        matchId: selectedMatch.id,
        betType: betForm.betType,
        betOn: betForm.betOn,
        amount: parseFloat(betForm.amount),
        odds: parseFloat(betForm.odds),
      });

      const data = res as any;

      // Check if there's a delay (backend returns delay info)
      if (data.delay && data.delay > 0) {
        setDelayTotal(data.delay);
        setDelayCountdown(data.delay);

        showToast({
          type: 'info',
          title: 'Bet Processing',
          message: `Verifying odds stability for ${data.delay}s...`,
          duration: (data.delay + 1) * 1000,
        });

        // Start countdown
        const interval = setInterval(() => {
          setDelayCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        countdownRef.current = interval;
      }

      showToast({
        type: 'success',
        title: 'Bet Placed!',
        message: `${betForm.betOn} - ${formatCurrency(parseFloat(betForm.amount))} @ ${betForm.odds} odds`,
      });

      setBetForm({ betType: 'MATCH_WINNER', betOn: '', amount: '', odds: '1.8' });
      setSelectedMatch(null);

      // Update balance from response if available
      if (data.data?.newBalance !== undefined) {
        updateBalance(data.data.newBalance);
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to place bet';
      showToast({
        type: 'error',
        title: 'Bet Failed',
        message: msg,
      });
    } finally {
      setBetLoading(false);
      setDelayCountdown(0);
      setDelayTotal(0);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'UPCOMING': return 'bg-blue-100 text-blue-700';
      case 'LIVE': return 'bg-red-100 text-red-700 animate-pulse';
      case 'COMPLETED': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const quickAmounts = [100, 500, 1000, 5000, 10000, 25000, 50000];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Header + Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Matches</h2>
          <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1">
            {['all', 'UPCOMING', 'LIVE', 'COMPLETED'].map((f) => (
              <button
                key={f}
                onClick={() => { setFilter(f); setLoading(true); }}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition whitespace-nowrap ${
                  filter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border'
                }`}
              >
                {f === 'all' ? 'All' : f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading matches...</div>
        ) : matches.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No matches found</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {matches.map((match: any) => (
              <div key={match.id} className="bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition">
                <div className="p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <span className="text-[10px] sm:text-xs text-gray-500 uppercase font-medium">{match.matchType}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${getStatusColor(match.status)}`}>
                      {match.status}
                    </span>
                  </div>

                  <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-1 leading-tight">
                    {match.team1} vs {match.team2}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 mb-1.5 sm:mb-2">{match.tournament}</p>

                  {match.venue && (
                    <p className="text-[10px] sm:text-xs text-gray-400 mb-2 sm:mb-3">{match.venue}{match.city ? `, ${match.city}` : ''}</p>
                  )}

                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-gray-500">{formatDate(match.startTime)}</span>
                    {match.team1Score && (
                      <span className="font-medium text-gray-900 text-xs">{match.team1Score}</span>
                    )}
                  </div>

                  {match.status !== 'COMPLETED' && match.status !== 'CANCELLED' && (
                    <button
                      onClick={() => {
                        setSelectedMatch(match);
                        setBetForm({ betType: 'MATCH_WINNER', betOn: '', amount: '', odds: '1.8' });
                      }}
                      className="w-full mt-3 sm:mt-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 active:bg-blue-800 transition"
                    >
                      Place Bet
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bet Modal - Top popup */}
        {selectedMatch && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-4 sm:pt-8 px-3">
            <div
              className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-slide-down max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-white rounded-t-2xl p-4 sm:p-5 border-b z-10">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">Place Bet</h3>
                  <button
                    onClick={() => setSelectedMatch(null)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-1">{selectedMatch.team1} vs {selectedMatch.team2}</p>
                {selectedMatch.tournament && (
                  <p className="text-xs text-gray-400 mt-0.5">{selectedMatch.tournament}</p>
                )}
              </div>

              {/* Modal Body */}
              <form onSubmit={handlePlaceBet} className="p-4 sm:p-5 space-y-4">
                {/* Bet Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Bet Type</label>
                  <select
                    value={betForm.betType}
                    onChange={(e) => setBetForm({ ...betForm, betType: e.target.value, betOn: '' })}
                    className="w-full px-3 py-2.5 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="MATCH_WINNER">Match Winner</option>
                    <option value="TOP_BATSMAN">Top Batsman</option>
                    <option value="TOP_BOWLER">Top Bowler</option>
                    <option value="TOTAL_RUNS">Total Runs</option>
                    <option value="SESSION">Session</option>
                  </select>
                </div>

                {/* Bet On */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Bet On</label>
                  {betForm.betType === 'MATCH_WINNER' ? (
                    <div className="grid grid-cols-2 gap-2">
                      {[selectedMatch.team1, selectedMatch.team2].map((team: string) => (
                        <button
                          key={team}
                          type="button"
                          onClick={() => setBetForm({ ...betForm, betOn: team })}
                          className={`py-3 rounded-lg text-sm font-medium border-2 transition ${
                            betForm.betOn === team
                              ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                              : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                          }`}
                        >
                          {team}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={betForm.betOn}
                      onChange={(e) => setBetForm({ ...betForm, betOn: e.target.value })}
                      placeholder="Enter selection"
                      required
                      className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  )}
                </div>

                {/* Amount & Odds */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount</label>
                    <input
                      type="number"
                      value={betForm.amount}
                      onChange={(e) => setBetForm({ ...betForm, amount: e.target.value })}
                      placeholder="Min 100"
                      min="10"
                      max="200000"
                      required
                      className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Odds</label>
                    <input
                      type="number"
                      value={betForm.odds}
                      onChange={(e) => setBetForm({ ...betForm, odds: e.target.value })}
                      step="0.01"
                      min="1"
                      required
                      className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                {/* Quick Amount Buttons */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Quick Amount</label>
                  <div className="flex flex-wrap gap-1.5">
                    {quickAmounts.map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setBetForm({ ...betForm, amount: amt.toString() })}
                        className={`px-2.5 py-1.5 rounded-md text-xs font-medium border transition ${
                          betForm.amount === amt.toString()
                            ? 'bg-blue-100 text-blue-700 border-blue-300'
                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {amt >= 1000 ? `${amt / 1000}K` : amt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Potential Win */}
                {betForm.amount && betForm.odds && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3.5 rounded-lg border border-blue-100">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-blue-700">Potential Win</span>
                      <span className="text-lg font-bold text-blue-700">
                        {formatCurrency(parseFloat(betForm.amount) * parseFloat(betForm.odds))}
                      </span>
                    </div>
                  </div>
                )}

                {/* Delay Countdown Bar */}
                {delayCountdown > 0 && (
                  <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4 text-yellow-600 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span className="text-sm text-yellow-700 font-medium">
                        Verifying odds... {delayCountdown}s
                      </span>
                    </div>
                    <div className="w-full bg-yellow-200 rounded-full h-1.5">
                      <div
                        className="bg-yellow-500 h-1.5 rounded-full transition-all duration-1000"
                        style={{ width: `${(delayCountdown / delayTotal) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={betLoading || !betForm.betOn || !betForm.amount}
                  className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
                >
                  {betLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Placing Bet...
                    </span>
                  ) : (
                    'Place Bet'
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
