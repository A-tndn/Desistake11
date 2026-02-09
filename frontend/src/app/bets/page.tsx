'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { betService } from '@/services/bet.service';
import { formatCurrency, formatDate } from '@/lib/utils';
import Navbar from '@/components/Navbar';

export default function BetsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [bets, setBets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

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

      <main className="max-w-7xl mx-auto px-4 py-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">My Bets</h2>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <p className="text-sm text-gray-500">Total Bets</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{bets.length}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <p className="text-sm text-gray-500">Total Staked</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(totalBetAmount)}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <p className="text-sm text-gray-500">Total Won</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(totalWon)}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <p className="text-sm text-gray-500">Total Lost</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(totalLost)}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4">
          {['all', 'PENDING', 'WON', 'LOST', 'CANCELLED'].map((f) => (
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

        {/* Bets List */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading bets...</div>
          ) : bets.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No bets found</div>
          ) : (
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
