'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { casinoService } from '@/services/casino.service';
import { Sparkles, TrendingUp, Zap, Crown } from 'lucide-react';

const gameConfig: Record<string, {
  gradient: string;
  icon: string;
  glow: string;
  accent: string;
  description: string;
}> = {
  BLACKJACK: {
    gradient: 'from-emerald-900 via-emerald-800 to-green-900',
    icon: 'A\u2660',
    glow: 'rgba(16, 185, 129, 0.4)',
    accent: '#10b981',
    description: 'Beat the dealer to 21',
  },
  COIN_FLIP: {
    gradient: 'from-amber-700 via-yellow-600 to-amber-700',
    icon: '\u00A4',
    glow: 'rgba(245, 158, 11, 0.4)',
    accent: '#f59e0b',
    description: 'Heads or tails - 50/50',
  },
  TEEN_PATTI: {
    gradient: 'from-purple-900 via-violet-800 to-purple-900',
    icon: '3\u2663',
    glow: 'rgba(139, 92, 246, 0.4)',
    accent: '#8b5cf6',
    description: 'Three card poker classic',
  },
  INDIAN_POKER: {
    gradient: 'from-purple-900 via-violet-800 to-purple-900',
    icon: '3\u2663',
    glow: 'rgba(139, 92, 246, 0.4)',
    accent: '#8b5cf6',
    description: 'Three card poker classic',
  },
  HI_LO: {
    gradient: 'from-rose-900 via-red-800 to-rose-900',
    icon: '\u2195',
    glow: 'rgba(244, 63, 94, 0.4)',
    accent: '#f43f5e',
    description: 'Predict high or low',
  },
  DICE_ROLL: {
    gradient: 'from-blue-900 via-indigo-800 to-blue-900',
    icon: '\u2684',
    glow: 'rgba(99, 102, 241, 0.4)',
    accent: '#6366f1',
    description: 'Roll the dice',
  },
  ANDAR_BAHAR: {
    gradient: 'from-teal-900 via-cyan-800 to-teal-900',
    icon: 'AB',
    glow: 'rgba(20, 184, 166, 0.4)',
    accent: '#14b8a6',
    description: 'Pick the winning side',
  },
};

const defaultConfig = {
  gradient: 'from-gray-800 via-gray-700 to-gray-800',
  icon: '\u2605',
  glow: 'rgba(156, 163, 175, 0.3)',
  accent: '#9ca3af',
  description: 'Try your luck',
};

export default function CasinoPage() {
  const router = useRouter();
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadGames(); }, []);

  const loadGames = async () => {
    try {
      const res: any = await casinoService.getGames();
      const data = res?.data?.games || res?.data || res?.games || [];
      setGames(Array.isArray(data) ? data : []);
    } catch { /* silent */ } finally { setLoading(false); }
  };

  return (
    <div className="max-w-3xl mx-auto pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 pt-5 pb-3"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg">
            <Crown className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Casino</h1>
            <p className="text-xs text-muted-foreground">Instant games, instant wins</p>
          </div>
        </div>
      </motion.div>

      <div className="px-3">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-2xl h-44 animate-pulse bg-muted/50" />
            ))}
          </div>
        ) : games.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <Sparkles className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No games available</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {games.map((game: any, index: number) => {
              const cfg = gameConfig[game.gameType] || defaultConfig;
              return (
                <motion.button
                  key={game.id}
                  initial={{ opacity: 0, y: 15, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{
                    delay: index * 0.05,
                    type: 'spring',
                    stiffness: 260,
                    damping: 20,
                  }}
                  whileHover={{ y: -4, scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() =>
                    router.push(
                      game.gameType === 'BLACKJACK'
                        ? `/casino/blackjack?gameId=${game.id}`
                        : `/casino/${game.id}`
                    )
                  }
                  className="relative rounded-2xl overflow-hidden text-left group"
                  style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}
                >
                  {/* Gradient Background */}
                  <div className={`bg-gradient-to-br ${cfg.gradient} p-4 pb-3 min-h-[110px] flex flex-col justify-between relative overflow-hidden`}>
                    {/* Subtle dot pattern */}
                    <div className="absolute inset-0 opacity-5"
                      style={{
                        backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
                        backgroundSize: '20px 20px',
                      }}
                    />

                    {/* Glow on hover */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{
                        background: `radial-gradient(circle at 50% 50%, ${cfg.glow}, transparent 70%)`,
                      }}
                    />

                    {/* Icon */}
                    <div className="relative z-10">
                      <span
                        className="text-4xl font-black text-white/90 drop-shadow-lg tracking-tight"
                        style={{ fontFamily: 'Georgia, serif', textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
                      >
                        {cfg.icon}
                      </span>
                    </div>

                    {/* Badge */}
                    <div className="relative z-10 flex items-center gap-1">
                      <span className="inline-flex items-center gap-1 text-[10px] text-white/70 bg-white/10 backdrop-blur-sm rounded-full px-2 py-0.5">
                        <Zap className="w-2.5 h-2.5" /> Instant
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="bg-card p-3 border-t border-border/30">
                    <h3 className="text-sm font-bold text-foreground truncate">
                      {game.gameName}
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {cfg.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      {game.rtp && (
                        <span className="text-[10px] text-muted-foreground/80 flex items-center gap-0.5">
                          <TrendingUp className="w-3 h-3" style={{ color: cfg.accent }} /> {Number(game.rtp)}% RTP
                        </span>
                      )}
                      {game.minBet && (
                        <span className="text-[10px] text-muted-foreground/60">
                          Min {'\u20B9'}{Number(game.minBet)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Shimmer border on hover */}
                  <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-white/10 transition-colors duration-300 pointer-events-none" />
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
