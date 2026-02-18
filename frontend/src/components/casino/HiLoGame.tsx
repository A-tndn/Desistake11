'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface HiLoGameProps {
  result: any | null;
  selectedBet: string;
  onSelectBet: (betType: string) => void;
  isPlaying: boolean;
}

const SUIT_COLORS: Record<string, boolean> = { '\u2665': true, '\u2666': true };
const CARD_SYMBOLS: Record<number, string> = {
  1: 'A', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7',
  8: '8', 9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K'
};

function PlayingCard({ value, suit, isRevealed, isPlaying }: {
  value: string; suit: string; isRevealed: boolean; isPlaying: boolean;
}) {
  const isRed = SUIT_COLORS[suit] || false;

  return (
    <div className="perspective-1000">
      <motion.div
        className="w-28 h-40 relative cursor-default"
        animate={{
          rotateY: isRevealed ? 180 : 0,
          scale: isPlaying ? [1, 1.05, 1] : 1,
        }}
        transition={
          isRevealed
            ? { duration: 0.7, ease: [0.4, 0, 0.2, 1] }
            : isPlaying
              ? { duration: 0.8, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0.3 }
        }
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Card Back - Stake111 branded */}
        <div
          className="absolute inset-0 rounded-xl overflow-hidden"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="w-full h-full bg-gradient-to-br from-emerald-700 via-teal-800 to-emerald-900 border-2 border-emerald-600/50 rounded-xl shadow-xl">
            {/* Pattern overlay */}
            <div className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,255,255,0.1) 8px, rgba(255,255,255,0.1) 16px)`,
              }}
            />
            {/* Center logo */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center mb-1">
                  <span className="text-white/80 font-black text-sm">S111</span>
                </div>
              </div>
            </div>
            {/* Border inset */}
            <div className="absolute inset-2 rounded-lg border border-white/10" />
          </div>
        </div>

        {/* Card Front */}
        <div
          className="absolute inset-0 rounded-xl bg-white border-2 shadow-xl overflow-hidden"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', borderColor: isRed ? '#fca5a5' : '#d1d5db' }}
        >
          {/* Subtle texture */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, #000 1px, transparent 0)',
              backgroundSize: '12px 12px',
            }}
          />
          {/* Top left */}
          <div className={cn('absolute top-2 left-2.5', isRed ? 'text-red-600' : 'text-gray-900')}>
            <div className="text-xl font-black leading-none">{value}</div>
            <div className="text-lg leading-none -mt-0.5">{suit}</div>
          </div>
          {/* Center suit */}
          <div className={cn('absolute inset-0 flex items-center justify-center', isRed ? 'text-red-600' : 'text-gray-900')}>
            <span className="text-5xl opacity-90" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>{suit}</span>
          </div>
          {/* Bottom right (rotated) */}
          <div className={cn('absolute bottom-2 right-2.5 rotate-180', isRed ? 'text-red-600' : 'text-gray-900')}>
            <div className="text-xl font-black leading-none">{value}</div>
            <div className="text-lg leading-none -mt-0.5">{suit}</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Deck stack visual behind the card
function DeckStack() {
  return (
    <div className="relative w-28 h-40">
      {[3, 2, 1].map((i) => (
        <div
          key={i}
          className="absolute rounded-xl bg-gradient-to-br from-emerald-700 via-teal-800 to-emerald-900 border border-emerald-600/30 shadow-md"
          style={{
            width: '100%',
            height: '100%',
            top: `${-i * 2}px`,
            left: `${i * 1.5}px`,
            zIndex: -i,
            opacity: 1 - i * 0.15,
          }}
        />
      ))}
    </div>
  );
}

export default function HiLoGame({ result, selectedBet, onSelectBet, isPlaying }: HiLoGameProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    if (isPlaying) {
      setIsRevealed(false);
      setShowResult(false);
    }
  }, [isPlaying]);

  useEffect(() => {
    if (result && !isPlaying) {
      setTimeout(() => setIsRevealed(true), 400);
      setTimeout(() => setShowResult(true), 1100);
    }
  }, [result, isPlaying]);

  // Parse result - backend sends { value: 1-13, cardName: "Ace"/"King"/etc, suit: "♠"/"♥"/etc }
  const numVal = result?.value || 7;
  const suit = result?.suit || '\u2660';
  const displayValue = CARD_SYMBOLS[numVal] || String(numVal);

  // Scale bar position (1-13 mapped to percentage)
  const scalePos = result ? ((numVal - 1) / 12) * 100 : 50;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Card + Deck */}
      <div className="relative my-2">
        {/* Deck behind */}
        <div className="absolute inset-0 z-0">
          <DeckStack />
        </div>
        {/* Active card */}
        <div className="relative z-10">
          <PlayingCard
            value={result ? displayValue : '?'}
            suit={result ? suit : ''}
            isRevealed={isRevealed}
            isPlaying={isPlaying}
          />
        </div>
      </div>

      {/* Value Scale Bar */}
      <div className="w-full max-w-xs">
        <div className="relative h-10 rounded-full overflow-hidden shadow-inner"
          style={{
            background: 'linear-gradient(90deg, #3b82f6 0%, #60a5fa 30%, #fbbf24 47%, #f59e0b 53%, #ef4444 70%, #dc2626 100%)',
          }}
        >
          {/* Labels */}
          <div className="absolute inset-0 flex items-center justify-between px-4 text-[11px] font-black text-white/90 drop-shadow-sm">
            <span>LOW</span>
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px]">7</span>
            <span>HIGH</span>
          </div>
          {/* Value indicator */}
          <AnimatePresence>
            {showResult && result && (
              <motion.div
                initial={{ left: '50%', scale: 0 }}
                animate={{ left: `${scalePos}%`, scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-white rounded-full shadow-lg border-2 border-gray-300 flex items-center justify-center z-10"
                style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.3)' }}
              >
                <span className="text-xs font-black text-gray-800">{numVal}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {/* Scale numbers */}
        <div className="flex justify-between px-1 mt-1">
          {[1, 4, 7, 10, 13].map(n => (
            <span key={n} className="text-[9px] text-muted-foreground/50 font-medium">{n}</span>
          ))}
        </div>
      </div>

      {/* Card Result Text */}
      <AnimatePresence>
        {showResult && result && !isPlaying && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="text-center"
          >
            <p className={cn(
              'text-xl font-black',
              numVal > 7 ? 'text-rose-600' : numVal < 7 ? 'text-blue-600' : 'text-amber-600'
            )}>
              {displayValue} {suit}
              <span className="text-sm font-medium text-muted-foreground ml-2">({numVal})</span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bet Selection */}
      <div className="grid grid-cols-3 gap-2.5 w-full max-w-sm">
        {[
          { type: 'HIGH', label: 'High', sub: '8-K', odds: '2.05x', bgFrom: 'from-rose-500', bgTo: 'to-red-700', ring: 'ring-rose-400', text: 'text-rose-600' },
          { type: 'EXACT', label: 'Exact 7', sub: '7 only', odds: '12.0x', bgFrom: 'from-amber-400', bgTo: 'to-yellow-600', ring: 'ring-amber-400', text: 'text-amber-600' },
          { type: 'LOW', label: 'Low', sub: 'A-6', odds: '2.05x', bgFrom: 'from-blue-500', bgTo: 'to-indigo-700', ring: 'ring-blue-400', text: 'text-blue-600' },
        ].map(({ type, label, sub, odds, bgFrom, bgTo, ring, text }) => (
          <motion.button
            key={type}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.93 }}
            onClick={() => onSelectBet(type)}
            disabled={isPlaying}
            className={cn(
              'relative p-3 rounded-2xl border-2 text-center transition-all overflow-hidden',
              selectedBet === type
                ? `border-transparent ring-2 ${ring} shadow-lg bg-card`
                : 'border-border bg-card hover:border-muted-foreground/30',
              isPlaying && 'opacity-50 cursor-not-allowed'
            )}
          >
            {selectedBet === type && (
              <div className={`absolute inset-0 bg-gradient-to-b ${bgFrom} ${bgTo} opacity-10`} />
            )}
            <div className="relative z-10">
              <span className="text-sm font-bold text-foreground block">{label}</span>
              <span className="text-[10px] text-muted-foreground block">{sub}</span>
              <span className={cn(
                'text-xs font-bold mt-1 block',
                selectedBet === type ? text : 'text-muted-foreground'
              )}>{odds}</span>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
