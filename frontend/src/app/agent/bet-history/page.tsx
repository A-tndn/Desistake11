'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { agentService } from '@/services/agent.service';
import { formatCurrency, formatDate } from '@/lib/utils';
import Navbar from '@/components/Navbar';

export default function AgentBetHistory() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [bets, setBets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!isAuthenticated || user?.type !== 'agent') { router.push('/login'); return; }
    loadData();
  }, [isAuthenticated, filter]);

  const loadData = async () => {
    try {
      const params: any = {};
      if (filter !== 'all') params.status = filter;
      const res = await agentService.getBetHistory(params);
      setBets((res as any).data || []);
    } catch (error) {
      console.error('Failed to load bet history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBetStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-700';
      case 'WON': return 'bg-green-100 text-green-700';
      case 'LOST': return 'bg-red-100 text-red-700';
      case 'CANCELLED': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const totalStaked = bets.reduce((sum, b) => sum + Number(b.amount), 0);
  const totalWon = bets.filter(b => b.status === 'WON').reduce((sum, b) => sum + Number(b.actualWin || 0), 0);
  const totalLost = bets.filter(b => b.status === 'LOST').reduce((sum, b) => sum + Number(b.amount), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Bet History</h2>

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border">
            <p className="text-xs text-gray-500">Total Bets</p>
            <p className="text-lg font-bold text-gray-900 mt-1">{bets.length}</p>
          </div>
          <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border">
            <p className="text-xs text-gray-500">Total Staked</p>
            <p className="text-lg font-bold text-blue-600 mt-1">{formatCurrency(totalStaked)}</p>
          </div>
          <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border">
            <p className="text-xs text-gray-500">Total Won</p>
            <p className="text-lg font-bold text-green-600 mt-1">{formatCurrency(totalWon)}</p>
          </div>
          <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border">
            <p className="text-xs text-gray-500">Total Lost</p>
            <p className="text-lg font-bold text-red-600 mt-1">{formatCurrency(totalLost)}</p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-1.5 sm:gap-2 mb-4 overflow-x-auto pb-1">
          {['all', 'PENDING', 'WON', 'LOST', 'CANCELLED'].map((f) => (
            <button key={f} onClick={() => { setFilter(f); setLoading(true); }}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition whitespace-nowrap ${
                filter === f ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border'
              }`}>
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-500">Loading...</div>
        ) : bets.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-500">No bets found</div>
        ) : (
          <>
            {/* Mobile */}
            <div className="sm:hidden space-y-3">
              {bets.map((bet: any) => (
                <div key={bet.id} className="bg-white rounded-xl shadow-sm border p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {bet.match?.team1} vs {bet.match?.team2}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Player: {bet.user?.displayName || bet.user?.username}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ml-2 ${getBetStatusColor(bet.status)}`}>
                      {bet.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">{bet.betOn}</span>
                    <span className="text-xs text-gray-500">@ {Number(bet.odds).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{formatCurrency(Number(bet.amount))}</span>
                    <span className="text-xs text-gray-400">{formatDate(bet.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop */}
            <div className="hidden sm:block bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Player</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Match</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Selection</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Odds</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {bets.map((bet: any) => (
                      <tr key={bet.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {bet.user?.displayName || bet.user?.username}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {bet.match?.team1} vs {bet.match?.team2}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{bet.betOn}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(Number(bet.amount))}</td>
                        <td className="px-4 py-3 text-sm text-right">{Number(bet.odds).toFixed(2)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getBetStatusColor(bet.status)}`}>
                            {bet.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-500">{formatDate(bet.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
