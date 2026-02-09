'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { matchService } from '@/services/match.service';
import { betService } from '@/services/bet.service';
import { formatCurrency, formatDate } from '@/lib/utils';
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
  const [betMessage, setBetMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    loadMatches();
  }, [isAuthenticated, filter]);

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
    setBetMessage({ type: '', text: '' });

    try {
      await betService.placeBet({
        matchId: selectedMatch.id,
        betType: betForm.betType,
        betOn: betForm.betOn,
        amount: parseFloat(betForm.amount),
        odds: parseFloat(betForm.odds),
      });
      setBetMessage({ type: 'success', text: 'Bet placed successfully!' });
      setBetForm({ betType: 'MATCH_WINNER', betOn: '', amount: '', odds: '1.8' });
      setSelectedMatch(null);
    } catch (error: any) {
      setBetMessage({ type: 'error', text: error.response?.data?.message || 'Failed to place bet' });
    } finally {
      setBetLoading(false);
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Matches</h2>
          <div className="flex gap-2">
            {['all', 'UPCOMING', 'LIVE', 'COMPLETED'].map((f) => (
              <button
                key={f}
                onClick={() => { setFilter(f); setLoading(true); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
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

        {betMessage.text && (
          <div className={`mb-4 p-4 rounded-lg ${betMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {betMessage.text}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading matches...</div>
        ) : matches.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No matches found</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {matches.map((match: any) => (
              <div key={match.id} className="bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition">
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-gray-500 uppercase font-medium">{match.matchType}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(match.status)}`}>
                      {match.status}
                    </span>
                  </div>

                  <h3 className="font-bold text-lg text-gray-900 mb-1">{match.team1} vs {match.team2}</h3>
                  <p className="text-sm text-gray-500 mb-2">{match.tournament}</p>

                  {match.venue && (
                    <p className="text-xs text-gray-400 mb-3">{match.venue}, {match.city}</p>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">{formatDate(match.startTime)}</span>
                    {match.team1Score && (
                      <span className="font-medium text-gray-900">{match.team1Score}</span>
                    )}
                  </div>

                  {match.status !== 'COMPLETED' && match.status !== 'CANCELLED' && (
                    <button
                      onClick={() => setSelectedMatch(match)}
                      className="w-full mt-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                    >
                      Place Bet
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bet Modal */}
        {selectedMatch && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md">
              <div className="p-5 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">Place Bet</h3>
                  <button onClick={() => setSelectedMatch(null)} className="text-gray-400 hover:text-gray-600">
                    X
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-1">{selectedMatch.team1} vs {selectedMatch.team2}</p>
              </div>

              <form onSubmit={handlePlaceBet} className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bet Type</label>
                  <select
                    value={betForm.betType}
                    onChange={(e) => setBetForm({ ...betForm, betType: e.target.value })}
                    className="w-full px-3 py-2.5 border rounded-lg"
                  >
                    <option value="MATCH_WINNER">Match Winner</option>
                    <option value="TOP_BATSMAN">Top Batsman</option>
                    <option value="TOP_BOWLER">Top Bowler</option>
                    <option value="TOTAL_RUNS">Total Runs</option>
                    <option value="SESSION">Session</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bet On</label>
                  {betForm.betType === 'MATCH_WINNER' ? (
                    <div className="grid grid-cols-2 gap-2">
                      {[selectedMatch.team1, selectedMatch.team2].map((team: string) => (
                        <button
                          key={team}
                          type="button"
                          onClick={() => setBetForm({ ...betForm, betOn: team })}
                          className={`py-2.5 rounded-lg text-sm font-medium border transition ${
                            betForm.betOn === team
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-700 hover:bg-gray-50'
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
                      className="w-full px-3 py-2.5 border rounded-lg"
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                    <input
                      type="number"
                      value={betForm.amount}
                      onChange={(e) => setBetForm({ ...betForm, amount: e.target.value })}
                      placeholder="Min 10"
                      min="10"
                      max="100000"
                      required
                      className="w-full px-3 py-2.5 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Odds</label>
                    <input
                      type="number"
                      value={betForm.odds}
                      onChange={(e) => setBetForm({ ...betForm, odds: e.target.value })}
                      step="0.01"
                      min="1"
                      required
                      className="w-full px-3 py-2.5 border rounded-lg"
                    />
                  </div>
                </div>

                {betForm.amount && betForm.odds && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-blue-700">
                      Potential Win: <span className="font-bold">{formatCurrency(parseFloat(betForm.amount) * parseFloat(betForm.odds))}</span>
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={betLoading || !betForm.betOn}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {betLoading ? 'Placing Bet...' : 'Place Bet'}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
