'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { matchService } from '@/services/match.service';
import { betService } from '@/services/bet.service';
import { formatCurrency, formatDate } from '@/lib/utils';
import Navbar from '@/components/Navbar';

export default function PlayerDashboard() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [matches, setMatches] = useState<any[]>([]);
  const [recentBets, setRecentBets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    loadData();
  }, [isAuthenticated]);

  const loadData = async () => {
    try {
      const [matchesRes, betsRes] = await Promise.all([
        matchService.getMatches({ limit: 5 }),
        betService.getUserBets({ limit: 5 }),
      ]);
      setMatches((matchesRes as any).data || []);
      setRecentBets((betsRes as any).data || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'UPCOMING': return 'bg-blue-100 text-blue-700';
      case 'LIVE': return 'bg-red-100 text-red-700';
      case 'COMPLETED': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getBetStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-700';
      case 'WON': return 'bg-green-100 text-green-700';
      case 'LOST': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Welcome back, {user?.displayName || user?.username}!</h2>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <p className="text-sm text-gray-500">Balance</p>
            <p className="text-3xl font-bold text-green-600 mt-1">
              {formatCurrency(user?.balance || 0)}
            </p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <p className="text-sm text-gray-500">Active Bets</p>
            <p className="text-3xl font-bold text-blue-600 mt-1">
              {recentBets.filter((b: any) => b.status === 'PENDING').length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <p className="text-sm text-gray-500">Total Bets</p>
            <p className="text-3xl font-bold text-purple-600 mt-1">
              {recentBets.length}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Matches */}
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-5 border-b flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Upcoming Matches</h3>
              <button
                onClick={() => router.push('/matches')}
                className="text-sm text-blue-600 hover:underline"
              >
                View All
              </button>
            </div>
            <div className="divide-y">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : matches.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No matches available</div>
              ) : (
                matches.map((match: any) => (
                  <div
                    key={match.id}
                    className="p-4 hover:bg-gray-50 cursor-pointer transition"
                    onClick={() => router.push(`/matches?id=${match.id}`)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">{match.team1} vs {match.team2}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(match.status)}`}>
                        {match.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>{match.tournament}</span>
                      <span>{formatDate(match.startTime)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Bets */}
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-5 border-b flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Recent Bets</h3>
              <button
                onClick={() => router.push('/bets')}
                className="text-sm text-blue-600 hover:underline"
              >
                View All
              </button>
            </div>
            <div className="divide-y">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : recentBets.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No bets placed yet</div>
              ) : (
                recentBets.map((bet: any) => (
                  <div key={bet.id} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">{bet.match?.name || 'Unknown Match'}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getBetStatusColor(bet.status)}`}>
                        {bet.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">{bet.betType} - {bet.betOn}</span>
                      <span className="font-medium">{formatCurrency(Number(bet.amount))}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
