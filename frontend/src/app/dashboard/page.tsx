'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { matchService } from '@/services/match.service';
import { betService } from '@/services/bet.service';
import { formatCurrency, formatDate } from '@/lib/utils';
import Navbar from '@/components/Navbar';

const bannerSlides = [
  { bg: 'from-blue-600 to-indigo-700', title: 'Welcome to CricBet!', subtitle: 'Place bets on live cricket matches worldwide' },
  { bg: 'from-green-600 to-emerald-700', title: 'IPL Season Live', subtitle: 'Bet on every ball, every over, every match' },
  { bg: 'from-purple-600 to-pink-600', title: 'New Player Bonus', subtitle: 'Contact your agent for special credit offers' },
];

export default function PlayerDashboard() {
  const router = useRouter();
  const { user, isAuthenticated, updateExposure } = useAuthStore();
  const [matches, setMatches] = useState<any[]>([]);
  const [recentBets, setRecentBets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    loadData();
  }, [isAuthenticated]);

  // Auto-rotate banner
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % bannerSlides.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    try {
      const [matchesRes, betsRes] = await Promise.all([
        matchService.getMatches({ limit: 5 }),
        betService.getUserBets({ limit: 20 }),
      ]);
      setMatches((matchesRes as any).data || []);
      const bets = (betsRes as any).data || [];
      setRecentBets(bets);

      // Calculate exposure (sum of pending bets)
      const exposure = bets
        .filter((b: any) => b.status === 'PENDING')
        .reduce((sum: number, b: any) => sum + Number(b.amount), 0);
      updateExposure(exposure);
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

  const liveCount = matches.filter(m => m.status === 'LIVE').length;
  const pendingBets = recentBets.filter((b: any) => b.status === 'PENDING');
  const exposure = pendingBets.reduce((sum: number, b: any) => sum + Number(b.amount), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Scrolling Marquee */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 mb-4 overflow-hidden">
          <div className="animate-marquee whitespace-nowrap text-sm text-yellow-800">
            Welcome to CricBet! Place your bets on live cricket matches. Contact your agent for deposits and withdrawals. Play responsibly.
          </div>
        </div>

        {/* Banner Carousel */}
        <div className="relative rounded-2xl overflow-hidden mb-6 h-32 sm:h-44">
          {bannerSlides.map((slide, i) => (
            <div
              key={i}
              className={`absolute inset-0 bg-gradient-to-r ${slide.bg} flex items-center justify-center text-white transition-opacity duration-500 ${
                i === currentSlide ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <div className="text-center px-6">
                <h2 className="text-xl sm:text-3xl font-bold">{slide.title}</h2>
                <p className="text-sm sm:text-base opacity-90 mt-1">{slide.subtitle}</p>
              </div>
            </div>
          ))}
          {/* Dots */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
            {bannerSlides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`w-2 h-2 rounded-full transition ${i === currentSlide ? 'bg-white' : 'bg-white/40'}`}
              />
            ))}
          </div>
        </div>

        {/* Quick Category Cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <button
            onClick={() => router.push('/inplay')}
            className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border hover:shadow-md transition text-center relative"
          >
            {liveCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{liveCount}</span>
            )}
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-2">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-xs sm:text-sm font-medium text-gray-900">In-Play</p>
          </button>
          <button
            onClick={() => router.push('/matches')}
            className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border hover:shadow-md transition text-center"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <p className="text-xs sm:text-sm font-medium text-gray-900">Cricket</p>
          </button>
          <button
            onClick={() => router.push('/bets')}
            className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border hover:shadow-md transition text-center"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-xs sm:text-sm font-medium text-gray-900">My Bets</p>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <p className="text-xs text-gray-500">Balance</p>
            <p className="text-lg sm:text-2xl font-bold text-green-600 mt-1">{formatCurrency(user?.balance || 0)}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <p className="text-xs text-gray-500">Exposure</p>
            <p className="text-lg sm:text-2xl font-bold text-red-600 mt-1">{formatCurrency(exposure)}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <p className="text-xs text-gray-500">Active Bets</p>
            <p className="text-lg sm:text-2xl font-bold text-blue-600 mt-1">{pendingBets.length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <p className="text-xs text-gray-500">Total Bets</p>
            <p className="text-lg sm:text-2xl font-bold text-purple-600 mt-1">{recentBets.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Upcoming Matches */}
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-4 sm:p-5 border-b flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Upcoming Matches</h3>
              <button onClick={() => router.push('/matches')} className="text-xs sm:text-sm text-blue-600 hover:underline">View All</button>
            </div>
            <div className="divide-y">
              {loading ? (
                <div className="p-8 text-center text-gray-500 text-sm">Loading...</div>
              ) : matches.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">No matches available</div>
              ) : (
                matches.map((match: any) => (
                  <div
                    key={match.id}
                    className="p-3 sm:p-4 hover:bg-gray-50 cursor-pointer transition"
                    onClick={() => router.push(`/matches/${match.id}`)}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-medium text-sm text-gray-900">{match.team1} vs {match.team2}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${getStatusColor(match.status)}`}>
                        {match.status === 'LIVE' && <span className="inline-block w-1.5 h-1.5 bg-red-500 rounded-full mr-1 animate-pulse" />}
                        {match.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
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
            <div className="p-4 sm:p-5 border-b flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Recent Bets</h3>
              <button onClick={() => router.push('/bets')} className="text-xs sm:text-sm text-blue-600 hover:underline">View All</button>
            </div>
            <div className="divide-y">
              {loading ? (
                <div className="p-8 text-center text-gray-500 text-sm">Loading...</div>
              ) : recentBets.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">No bets placed yet</div>
              ) : (
                recentBets.slice(0, 5).map((bet: any) => (
                  <div key={bet.id} className="p-3 sm:p-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-medium text-sm text-gray-900">
                        {bet.match?.team1 && bet.match?.team2
                          ? `${bet.match.team1} vs ${bet.match.team2}`
                          : bet.match?.name || 'Match'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${getBetStatusColor(bet.status)}`}>
                        {bet.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">{bet.betType.replace(/_/g, ' ')} - {bet.betOn}</span>
                      <span className="font-medium text-gray-900">{formatCurrency(Number(bet.amount))}</span>
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
