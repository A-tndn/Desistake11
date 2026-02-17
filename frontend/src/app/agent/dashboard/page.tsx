'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { agentService } from '@/services/agent.service';
import { formatCurrency } from '@/lib/utils';
import Navbar from '@/components/Navbar';

export default function AgentDashboard() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || user?.type !== 'agent') {
      router.push('/login');
      return;
    }
    loadData();
  }, [isAuthenticated]);

  const loadData = async () => {
    try {
      const [statsRes, playersRes] = await Promise.all([
        agentService.getStats(),
        agentService.getPlayers(),
      ]);
      setStats((statsRes as any).data);
      setPlayers((playersRes as any).data || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Agent Dashboard</h2>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading dashboard...</div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-xl p-6 shadow-sm border">
                <p className="text-sm text-gray-500">Balance</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {formatCurrency(stats?.balance || 0)}
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border">
                <p className="text-sm text-gray-500">Total Players</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">
                  {stats?.stats?.totalPlayers || 0}
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border">
                <p className="text-sm text-gray-500">Total Commissions</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">
                  {formatCurrency(stats?.totalCommissions || 0)}
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border">
                <p className="text-sm text-gray-500">Unpaid Commissions</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">
                  {formatCurrency(stats?.unpaidCommissions || 0)}
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
              <button onClick={() => router.push('/agent/players')}
                className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border hover:shadow-md transition text-left">
                <h3 className="font-semibold text-gray-900 mb-1 text-sm sm:text-base">Manage Players</h3>
                <p className="text-xs sm:text-sm text-gray-500">Create and manage accounts</p>
              </button>
              <button onClick={() => router.push('/agent/credits')}
                className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border hover:shadow-md transition text-left">
                <h3 className="font-semibold text-gray-900 mb-1 text-sm sm:text-base">Credits</h3>
                <p className="text-xs sm:text-sm text-gray-500">Transfer or deduct credits</p>
              </button>
              <button onClick={() => router.push('/agent/account-statement')}
                className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border hover:shadow-md transition text-left">
                <h3 className="font-semibold text-gray-900 mb-1 text-sm sm:text-base">Account Statement</h3>
                <p className="text-xs sm:text-sm text-gray-500">View all transactions</p>
              </button>
              <button onClick={() => router.push('/agent/bet-history')}
                className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border hover:shadow-md transition text-left">
                <h3 className="font-semibold text-gray-900 mb-1 text-sm sm:text-base">Bet History</h3>
                <p className="text-xs sm:text-sm text-gray-500">All player bets</p>
              </button>
              <button onClick={() => router.push('/agent/client-ledger')}
                className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border hover:shadow-md transition text-left">
                <h3 className="font-semibold text-gray-900 mb-1 text-sm sm:text-base">Client Ledger</h3>
                <p className="text-xs sm:text-sm text-gray-500">P&L by client</p>
              </button>
              <button onClick={() => router.push('/agent/commissions')}
                className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border hover:shadow-md transition text-left">
                <h3 className="font-semibold text-gray-900 mb-1 text-sm sm:text-base">Commissions</h3>
                <p className="text-xs sm:text-sm text-gray-500">Commission lena dena</p>
              </button>
              <button onClick={() => router.push('/matches')}
                className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border hover:shadow-md transition text-left">
                <h3 className="font-semibold text-gray-900 mb-1 text-sm sm:text-base">View Matches</h3>
                <p className="text-xs sm:text-sm text-gray-500">Live and upcoming matches</p>
              </button>
              {(user?.role === 'MASTER' || user?.role === 'SUPER_MASTER') && (
                <button onClick={() => router.push('/agent/player-settings')}
                  className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border hover:shadow-md transition text-left border-l-4 border-l-amber-400">
                  <h3 className="font-semibold text-gray-900 mb-1 text-sm sm:text-base">Player Settings</h3>
                  <p className="text-xs sm:text-sm text-gray-500">Delay, stakes & permissions</p>
                </button>
              )}
            </div>

            {/* Players Table */}
            <div className="bg-white rounded-xl shadow-sm border">
              <div className="p-5 border-b flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Your Players</h3>
                <button
                  onClick={() => router.push('/agent/players')}
                  className="text-sm text-blue-600 hover:underline"
                >
                  View All
                </button>
              </div>
              {players.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No players yet</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Player</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Credit Limit</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {players.slice(0, 10).map((player: any) => (
                        <tr key={player.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-gray-900">{player.displayName}</p>
                            <p className="text-xs text-gray-500">@{player.username}</p>
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-medium">
                            {formatCurrency(Number(player.balance))}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-500">
                            {formatCurrency(Number(player.creditLimit))}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              player.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {player.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
