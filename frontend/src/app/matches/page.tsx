'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { matchService } from '@/services/match.service';
import { formatDate } from '@/lib/utils';
import Navbar from '@/components/Navbar';

export default function MatchesPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

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
              <div
                key={match.id}
                onClick={() => router.push(`/matches/${match.id}`)}
                className="bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition cursor-pointer"
              >
                <div className="p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <span className="text-[10px] sm:text-xs text-gray-500 uppercase font-medium">{match.matchType}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${getStatusColor(match.status)}`}>
                      {match.status === 'LIVE' && <span className="inline-block w-1.5 h-1.5 bg-red-500 rounded-full mr-1" />}
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

                  <button
                    className={`w-full mt-3 sm:mt-4 py-2.5 rounded-lg text-sm font-medium transition ${
                      match.status === 'COMPLETED' || match.status === 'CANCELLED'
                        ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        : match.status === 'LIVE'
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
                    }`}
                  >
                    {match.status === 'LIVE' ? 'Bet Now' : match.status === 'COMPLETED' ? 'View Result' : 'View Match'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
