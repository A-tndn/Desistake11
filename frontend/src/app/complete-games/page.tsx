'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { userService } from '@/services/user.service';
import { formatCurrency, formatDate } from '@/lib/utils';
import Navbar from '@/components/Navbar';

export default function CompleteGamesPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    loadGames();
  }, [isAuthenticated]);

  const loadGames = async () => {
    try {
      const res = await userService.getCompletedGames();
      setGames((res as any).data || []);
    } catch (error) {
      console.error('Failed to load games:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Completed Games</h2>

        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-500">Loading...</div>
        ) : games.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-500">No completed games found</div>
        ) : (
          <div className="space-y-3">
            {games.map((game: any) => (
              <div key={game.match.id} className="bg-white rounded-xl shadow-sm border p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{game.match.team1} vs {game.match.team2}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{game.match.tournament}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(game.match.startTime)}</p>
                    {game.match.matchWinner && (
                      <p className="text-xs text-green-600 mt-1 font-medium">Won by: {game.match.matchWinner}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 sm:gap-6">
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Match Bets</p>
                      <p className="text-lg font-bold text-gray-900">{game.matchBetsCount}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Session Bets</p>
                      <p className="text-lg font-bold text-gray-900">{game.sessionBetsCount}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Profit/Loss</p>
                      <p className={`text-lg font-bold ${game.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {game.profit >= 0 ? '+' : ''}{formatCurrency(game.profit)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
