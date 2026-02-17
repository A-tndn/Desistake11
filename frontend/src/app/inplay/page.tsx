'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { matchService } from '@/services/match.service';
import { formatDate } from '@/lib/utils';
import Navbar from '@/components/Navbar';

export default function InplayPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    loadMatches();
    const interval = setInterval(loadMatches, 15000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const loadMatches = async () => {
    try {
      const res = await matchService.getMatches({ status: 'LIVE', limit: 50 });
      setMatches((res as any).data || []);
    } catch (error) {
      console.error('Failed to load live matches:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">In-Play</h2>
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            LIVE
          </span>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-500">Loading live matches...</div>
        ) : matches.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-500 text-lg font-medium">No live matches right now</p>
            <p className="text-gray-400 text-sm mt-1">Check back later for live cricket action</p>
            <button
              onClick={() => router.push('/matches')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
            >
              View Upcoming Matches
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {matches.map((match: any) => (
              <div key={match.id} className="bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition">
                <div className="bg-red-600 px-4 py-1.5 flex items-center justify-between">
                  <span className="text-white text-xs font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    INPLAY
                  </span>
                  <span className="text-white/80 text-xs">{match.matchType}</span>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 mb-1">{match.team1} vs {match.team2}</h3>
                  <p className="text-xs text-gray-500 mb-2">{match.tournament}</p>

                  {(match.team1Score || match.team2Score) && (
                    <div className="bg-gray-50 rounded-lg p-2 mb-3 text-xs">
                      {match.team1Score && <p className="text-gray-700">{match.team1}: {match.team1Score}</p>}
                      {match.team2Score && <p className="text-gray-700">{match.team2}: {match.team2Score}</p>}
                    </div>
                  )}

                  <p className="text-xs text-gray-400">{formatDate(match.startTime)}</p>

                  <button
                    onClick={() => router.push(`/matches/${match.id}`)}
                    className="w-full mt-3 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                  >
                    Place Bet
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
