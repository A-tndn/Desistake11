'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { betService } from '@/services/bet.service';
import { formatCurrency, formatDate } from '@/lib/utils';
import { showToast } from '@/components/Toast';
import Navbar from '@/components/Navbar';

export default function BetsPage() {
  const router = useRouter();
  const { isAuthenticated, updateBalance } = useAuthStore();
  const [bets, setBets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [deletingBetId, setDeletingBetId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    loadBets();
  }, [isAuthenticated, filter]);

  const loadBets = async () => {
    try {
      const params: any = { limit: 100 };
      if (filter !== 'all') params.status = filter;
      const res = await betService.getUserBets(params);
      setBets((res as any).data || []);
    } catch (error) {
      console.error('Failed to load bets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBet = async (betId: string) => {
    setDeletingBetId(betId);
    try {
      const res = await betService.deleteBet(betId);
      const data = res as any;
      showToast({
        type: 'success',
        title: 'Bet Deleted',
        message: `Bet cancelled. ${formatCurrency(data.data?.refundedAmount || 0)} refunded to your balance.`,
      });
      if (data.data?.newBalance !== undefined) {
        updateBalance(data.data.newBalance);
      }
      loadBets();
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'Delete Failed',
        message: error.response?.data?.message || 'Could not delete bet',
      });
    } finally {
      setDeletingBetId(null);
    }
  };

  const canDeleteBet = (bet: any) => {
    if (bet.status !== 'PENDING') return false;
    const betAge = Date.now() - new Date(bet.createdAt).getTime();
    return betAge < 30000; // 30 second window
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

  const totalBetAmount = bets.reduce((sum, b) => sum + Number(b.amount), 0);
  const totalWon = bets.filter(b => b.status === 'WON').reduce((sum, b) => sum + Number(b.actualWin || 0), 0);
  const totalLost = bets.filter(b => b.status === 'LOST').reduce((sum, b) => sum + Number(b.amount), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">My Bets</h2>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="bg-white rounded-xl p-3 sm:p-5 shadow-sm border">
            <p className="text-xs sm:text-sm text-gray-500">Total Bets</p>
            <p className="text-lg sm:text-2xl font-bold text-gray-900 mt-1">{bets.length}</p>
          </div>
          <div className="bg-white rounded-xl p-3 sm:p-5 shadow-sm border">
            <p className="text-xs sm:text-sm text-gray-500">Total Staked</p>
            <p className="text-lg sm:text-2xl font-bold text-blue-600 mt-1">{formatCurrency(totalBetAmount)}</p>
          </div>
          <div className="bg-white rounded-xl p-3 sm:p-5 shadow-sm border">
            <p className="text-xs sm:text-sm text-gray-500">Total Won</p>
            <p className="text-lg sm:text-2xl font-bold text-green-600 mt-1">{formatCurrency(totalWon)}</p>
          </div>
          <div className="bg-white rounded-xl p-3 sm:p-5 shadow-sm border">
            <p className="text-xs sm:text-sm text-gray-500">Total Lost</p>
            <p className="text-lg sm:text-2xl font-bold text-red-600 mt-1">{formatCurrency(totalLost)}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-1.5 sm:gap-2 mb-4 overflow-x-auto pb-1">
          {['all', 'PENDING', 'WON', 'LOST', 'CANCELLED'].map((f) => (
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

        {/* Bets List - Card layout for mobile, table for desktop */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-500">Loading bets...</div>
        ) : bets.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-500">No bets found</div>
        ) : (
          <>
            {/* Mobile card view */}
            <div className="sm:hidden space-y-3">
              {bets.map((bet: any) => (
                <div key={bet.id} className="bg-white rounded-xl shadow-sm border p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {bet.match?.team1} vs {bet.match?.team2}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{bet.betType.replace('_', ' ')}</p>
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
                    <div>
                      <span className="text-gray-500 text-xs">Amount: </span>
                      <span className="font-medium">{formatCurrency(Number(bet.amount))}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs">Win: </span>
                      <span className="font-medium text-blue-600">{formatCurrency(Number(bet.potentialWin))}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t">
                    <span className="text-xs text-gray-400">{formatDate(bet.createdAt)}</span>
                    {canDeleteBet(bet) && (
                      <button
                        onClick={() => handleDeleteBet(bet.id)}
                        disabled={deletingBetId === bet.id}
                        className="text-xs text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                      >
                        {deletingBetId === bet.id ? 'Deleting...' : 'Delete'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table view */}
            <div className="hidden sm:block bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Match</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Selection</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Odds</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Potential</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {bets.map((bet: any) => (
                      <tr key={bet.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-900">
                            {bet.match?.team1} vs {bet.match?.team2}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{bet.betType.replace('_', ' ')}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{bet.betOn}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(Number(bet.amount))}</td>
                        <td className="px-4 py-3 text-sm text-right">{Number(bet.odds).toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-right text-blue-600 font-medium">
                          {formatCurrency(Number(bet.potentialWin))}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getBetStatusColor(bet.status)}`}>
                            {bet.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-500">{formatDate(bet.createdAt)}</td>
                        <td className="px-4 py-3 text-center">
                          {canDeleteBet(bet) && (
                            <button
                              onClick={() => handleDeleteBet(bet.id)}
                              disabled={deletingBetId === bet.id}
                              className="text-xs text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                            >
                              {deletingBetId === bet.id ? '...' : 'Delete'}
                            </button>
                          )}
                        </td>
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
