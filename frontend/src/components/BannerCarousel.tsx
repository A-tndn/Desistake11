'use client';

import { useState, useEffect, useCallback } from 'react';
import { matchService } from '@/services/match.service';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const defaultBanners = [
  {
    id: 'default-1',
    title: 'Welcome to Stake111',
    subtitle: 'India\'s Premier Cricket Betting Platform',
    gradient: 'from-brand-teal to-emerald-600',
    emoji: '🏏',
    enabled: true,
  },
  {
    id: 'default-2',
    title: 'Live Cricket Betting',
    subtitle: 'Bet on every ball with live odds',
    gradient: 'from-blue-600 to-purple-600',
    emoji: '🔥',
    enabled: true,
  },
  {
    id: 'default-3',
    title: 'Casino Games',
    subtitle: 'Try Dice, Coin Flip, Hi-Lo & more',
    gradient: 'from-brand-orange to-red-500',
    emoji: '🎰',
    enabled: true,
  },
  {
    id: 'default-4',
    title: 'Instant Payouts',
    subtitle: 'Fast deposits & withdrawals 24/7',
    gradient: 'from-green-500 to-teal-600',
    emoji: '💰',
    enabled: true,
  },
];

interface Banner {
  id: string;
  title: string;
  subtitle: string;
  gradient: string;
  emoji: string;
  imageUrl?: string;
  enabled: boolean;
}

export default function BannerCarousel() {
  const [current, setCurrent] = useState(0);
  const [banners, setBanners] = useState<Banner[]>(defaultBanners);
  const [carouselEnabled, setCarouselEnabled] = useState(true);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const res: any = await matchService.getBanners();
        const data = res?.data || res;
        if (data?.banners && data.banners.length > 0) {
          setBanners(data.banners.filter((b: Banner) => b.enabled));
          setCarouselEnabled(data.enabled !== false);
        }
      } catch {
        // Use defaults silently
      }
    };
    fetchBanners();
  }, []);

  const activeBanners = banners.filter(b => b.enabled);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % activeBanners.length);
  }, [activeBanners.length]);

  const prev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + activeBanners.length) % activeBanners.length);
  }, [activeBanners.length]);

  useEffect(() => {
    if (activeBanners.length <= 1) return;
    const timer = setInterval(next, 4000);
    return () => clearInterval(timer);
  }, [next, activeBanners.length]);

  if (!carouselEnabled || activeBanners.length === 0) return null;

  return (
    <div className="relative mx-3 mt-2 mb-1 overflow-hidden rounded-xl">
      <div
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {activeBanners.map((banner) => (
          <div key={banner.id} className="w-full flex-shrink-0">
            {banner.imageUrl ? (
              <div className="relative">
                <img
                  src={banner.imageUrl}
                  alt={banner.title}
                  className="w-full h-28 sm:h-36 object-cover"
                />
                {(banner.title || banner.subtitle) && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                    {banner.title && <p className="text-white text-sm font-bold">{banner.title}</p>}
                    {banner.subtitle && <p className="text-white/80 text-xs">{banner.subtitle}</p>}
                  </div>
                )}
              </div>
            ) : (
              <div className={`bg-gradient-to-r ${banner.gradient || 'from-brand-teal to-emerald-600'} p-4 sm:p-6`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white text-base sm:text-lg font-bold leading-tight">{banner.title}</p>
                    <p className="text-white/80 text-xs sm:text-sm mt-1">{banner.subtitle}</p>
                  </div>
                  {banner.emoji && <span className="text-3xl sm:text-4xl">{banner.emoji}</span>}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {activeBanners.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 bg-black/30 rounded-full flex items-center justify-center text-white hover:bg-black/50 transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={next}
            className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 bg-black/30 rounded-full flex items-center justify-center text-white hover:bg-black/50 transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
            {activeBanners.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  i === current ? 'bg-white w-4' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
