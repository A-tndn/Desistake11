'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { matchService } from '@/services/match.service';
import { useMatchStore } from '@/store/matchStore';
import MatchCard from '@/components/betting/MatchCard';
import BetSlip from '@/components/betting/BetSlip';
import BannerCarousel from '@/components/BannerCarousel';
import { cn } from '@/lib/utils';

type MainTab = 'cricket' | 'casino';

export default function DashboardPage() {
  const router = useRouter();
  const { matches, setMatches } = useMatchStore();
  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState<MainTab>('cricket');

  useEffect(() => {
    loadMatches();
    const interval = setInterval(loadMatches, 15000);
    return () => clearInterval(interval);
  }, []);

  const loadMatches = async () => {
    try {
      const res: any = await matchService.getMatches();
      const data = res?.data || res?.matches || res || [];
      setMatches(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load matches', err);
    } finally {
      setLoading(false);
    }
  };

  // Sort: LIVE first, then UPCOMING by startTime, then others
  const sortedMatches = [...matches].sort((a, b) => {
    const statusOrder: Record<string, number> = { LIVE: 0, UPCOMING: 1, COMPLETED: 2, CANCELLED: 3 };
    const aOrder = statusOrder[a.status] ?? 9;
    const bOrder = statusOrder[b.status] ?? 9;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
  });

  return (
    <div className="max-w-3xl mx-auto pb-20">
      {/* Banner Carousel */}
      <BannerCarousel />

      {/* Cricket / Casino Tab Bar */}
      <div className="grid grid-cols-2 bg-brand-teal-dark mx-0">
        <button
          onClick={() => setMainTab('cricket')}
          className={cn(
            'flex items-center justify-center gap-2 py-3 text-sm font-bold transition',
            mainTab === 'cricket'
              ? 'bg-brand-teal text-white'
              : 'text-white/60 hover:text-white/80'
          )}
        >
          <span className="text-lg">🏏</span> Cricket
        </button>
        <button
          onClick={() => {
            setMainTab('casino');
            router.push('/casino');
          }}
          className={cn(
            'flex items-center justify-center gap-2 py-3 text-sm font-bold transition',
            mainTab === 'casino'
              ? 'bg-brand-teal text-white'
              : 'text-white/60 hover:text-white/80'
          )}
        >
          <span className="text-lg">🎰</span> Casino
        </button>
      </div>

      {/* Cricket Section Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border-b">
        <span className="text-lg">🏏</span>
        <span className="text-sm font-bold text-gray-800">Cricket</span>
      </div>

      {/* Match List */}
      <div className="px-2 py-2 space-y-2 bg-gray-100 min-h-[300px]">
        {loading ? (
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg border h-24 animate-pulse" />
          ))
        ) : sortedMatches.length === 0 ? (
          <div className="text-center py-16 text-gray-500 text-sm">
            No cricket matches available
          </div>
        ) : (
          sortedMatches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))
        )}
      </div>

      {/* Bet slip */}
      <BetSlip />
    </div>
  );
}
