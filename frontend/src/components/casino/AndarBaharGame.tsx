'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AndarBaharGameProps {
  result: any | null;
  selectedBet: string;
  onSelectBet: (betType: string) => void;
  isPlaying: boolean;
}

function MiniCard({ value, suit, delay, isMatch, index }: {
  value: string; suit: string; delay: number; isMatch?: boolean; index: number;
}) {
  const isRed = suit === '\u2665' || suit === '\u2666';
  return (
    <motion.div
      initial={{ y: -60, opacity: 0, scale: 0.5, rotateZ: -15 }}
      animate={{ y: 0, opacity: 1, scale: 1, rotateZ: 0 }}
      transition={{
        delay,
        duration: 0.4,
        type: 'spring',
        stiffness: 300,
        damping: 20,
      }}
      className={cn(
        'w-11 h-16 rounded-lg bg-white border-2 flex flex-col items-center justify-center shadow-md shrink-0 relative',
        isMatch
          ? 'border-green-400 ring-2 ring-green-400/60 shadow-green-200/50 shadow-lg'
          : 'border-gray-200/80'
      )}
    >
      {isMatch && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 0.6, repeat: Infinity }}
          className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center"
        >
          <span className="text-white text-[8px] font-bold">{'\u2713'}</span>
        </motion.div>
      )}
      <span className={cn('text-xs font-black leading-none', isRed ? 'text-red-600' : 'text-gray-900')}>
        {value}
      </span>
      <span className={cn('text-[10px] leading-none', isRed ? 'text-red-500' : 'text-gray-700')}>
        {suit}
      </span>
    </motion.div>
  );
}

function parseCardString(card: string) {
  if (!card || typeof card !== 'string') return { value: '?', suit: '\u2660', isRed: false };
  // Backend format: "A\u2660", "10\u2665", "K\u2666" etc
  const suitChars = ['\u2660', '\u2665', '\u2666', '\u2663'];
  let suit = '\u2660';
  let value = card;
  for (const s of suitChars) {
    if (card.includes(s)) {
      suit = s;
      value = card.replace(s, '');
      break;
    }
  }
  const isRed = suit === '\u2665' || suit === '\u2666';
  return { value, suit, isRed };
}

export default function AndarBaharGame({ result, selectedBet, onSelectBet, isPlaying }: AndarBaharGameProps) {
  const [revealedAndar, setRevealedAndar] = useState<number>(0);
  const [revealedBahar, setRevealedBahar] = useState<number>(0);
  const [showJoker, setShowJoker] = useState(false);
  const [revealComplete, setRevealComplete] = useState(false);
  const revealTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isPlaying) {
      setShowJoker(false);
      setRevealedAndar(0);
      setRevealedBahar(0);
      setRevealComplete(false);
    }
  }, [isPlaying]);

  // Sequential card reveal animation
  useEffect(() => {
    if (result && !isPlaying) {
      const andarCards: string[] = result?.andarCards || [];
      const baharCards: string[] = result?.baharCards || [];
      const totalCards = andarCards.length + baharCards.length;

      // First show the joker
      setTimeout(() => setShowJoker(true), 200);

      // Then reveal cards one by one, alternating Andar/Bahar
      let cardIndex = 0;
      let aCount = 0;
      let bCount = 0;

      const revealNext = () => {
        if (cardIndex >= totalCards) {
          setRevealComplete(true);
          return;
        }
        const isAndarTurn = cardIndex % 2 === 0;
        if (isAndarTurn && aCount < andarCards.length) {
          aCount++;
          setRevealedAndar(aCount);
        } else if (!isAndarTurn && bCount < baharCards.length) {
          bCount++;
          setRevealedBahar(bCount);
        } else {
          // Other side might have the remaining card
          if (aCount < andarCards.length) { aCount++; setRevealedAndar(aCount); }
          else if (bCount < baharCards.length) { bCount++; setRevealedBahar(bCount); }
        }
        cardIndex++;
        revealTimerRef.current = setTimeout(revealNext, 350);
      };

      // Start revealing after joker shows
      revealTimerRef.current = setTimeout(revealNext, 800);

      return () => {
        if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
      };
    }
  }, [result, isPlaying]);

  // Skip animation - reveal all cards immediately
  const skipAnimation = useCallback(() => {
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    const andarCards: string[] = result?.andarCards || [];
    const baharCards: string[] = result?.baharCards || [];
    setRevealedAndar(andarCards.length);
    setRevealedBahar(baharCards.length);
    setRevealComplete(true);
  }, [result]);

  const jokerDisplay = result?.joker ? parseCardString(result.joker) : null;
  const andarCards: string[] = result?.andarCards || [];
  const baharCards: string[] = result?.baharCards || [];
  const winner = result?.winner || '';

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Joker Card */}
      <div className="text-center">
        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mb-1.5">Joker Card</p>
        <AnimatePresence>
          {showJoker && jokerDisplay ? (
            <motion.div
              initial={{ scale: 0, rotateZ: -30 }}
              animate={{ scale: 1, rotateZ: 0 }}
              transition={{ type: 'spring', stiffness: 250, damping: 15 }}
              className="w-16 h-24 mx-auto rounded-xl bg-white border-2 border-amber-400 shadow-lg flex flex-col items-center justify-center relative overflow-hidden"
              style={{ boxShadow: '0 0 20px rgba(245, 158, 11, 0.3)' }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-amber-50/50 to-transparent" />
              <span className={cn('text-xl font-black relative z-10', jokerDisplay.isRed ? 'text-red-600' : 'text-gray-900')}>
                {jokerDisplay.value}
              </span>
              <span className={cn('text-lg relative z-10', jokerDisplay.isRed ? 'text-red-500' : 'text-gray-700')}>
                {jokerDisplay.suit}
              </span>
            </motion.div>
          ) : (
            <div className="w-16 h-24 mx-auto rounded-xl bg-gradient-to-br from-emerald-700 to-teal-900 border border-emerald-600/30 opacity-50 flex items-center justify-center">
              <span className="text-white/40 text-lg">?</span>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Card Rows */}
      <div className="w-full max-w-sm space-y-2">
        {/* Andar Row */}
        <div className="bg-card/50 rounded-xl p-2 border border-border/50">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <span className={cn(
                'text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full',
                winner === 'ANDAR' && revealComplete
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'text-muted-foreground bg-muted'
              )}>
                Andar
              </span>
              {winner === 'ANDAR' && revealComplete && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-[10px] text-green-600 font-bold"
                >
                  Winner!
                </motion.span>
              )}
            </div>
            <span className="text-[9px] text-muted-foreground">{revealedAndar}/{andarCards.length}</span>
          </div>
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide min-h-[68px] items-center">
            {andarCards.length > 0 && showJoker ? (
              andarCards.slice(0, revealedAndar).map((card, i) => {
                const parsed = parseCardString(card);
                return (
                  <MiniCard
                    key={i}
                    value={parsed.value}
                    suit={parsed.suit}
                    delay={0}
                    index={i}
                    isMatch={i === andarCards.length - 1 && winner === 'ANDAR' && revealComplete}
                  />
                );
              })
            ) : (
              <div className="text-[10px] text-muted-foreground/40 italic px-2">Cards appear here...</div>
            )}
          </div>
        </div>

        {/* Bahar Row */}
        <div className="bg-card/50 rounded-xl p-2 border border-border/50">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <span className={cn(
                'text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full',
                winner === 'BAHAR' && revealComplete
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'text-muted-foreground bg-muted'
              )}>
                Bahar
              </span>
              {winner === 'BAHAR' && revealComplete && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-[10px] text-green-600 font-bold"
                >
                  Winner!
                </motion.span>
              )}
            </div>
            <span className="text-[9px] text-muted-foreground">{revealedBahar}/{baharCards.length}</span>
          </div>
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide min-h-[68px] items-center">
            {baharCards.length > 0 && showJoker ? (
              baharCards.slice(0, revealedBahar).map((card, i) => {
                const parsed = parseCardString(card);
                return (
                  <MiniCard
                    key={i}
                    value={parsed.value}
                    suit={parsed.suit}
                    delay={0}
                    index={i}
                    isMatch={i === baharCards.length - 1 && winner === 'BAHAR' && revealComplete}
                  />
                );
              })
            ) : (
              <div className="text-[10px] text-muted-foreground/40 italic px-2">Cards appear here...</div>
            )}
          </div>
        </div>
      </div>

      {/* Skip Animation Button */}
      {result && !revealComplete && !isPlaying && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={skipAnimation}
          className="text-[10px] text-muted-foreground hover:text-foreground underline transition"
        >
          Skip animation
        </motion.button>
      )}

      {/* Bet Selection */}
      <div className="grid grid-cols-2 gap-3 w-full max-w-xs mt-1">
        <motion.button
          whileHover={{ scale: 1.04, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelectBet('ANDAR')}
          disabled={isPlaying}
          className={cn(
            'p-3.5 rounded-2xl border-2 text-center transition-all relative overflow-hidden',
            selectedBet === 'ANDAR'
              ? 'border-teal-400 ring-2 ring-teal-400/40 shadow-lg bg-card'
              : 'border-border bg-card hover:border-teal-300',
            isPlaying && 'opacity-50 cursor-not-allowed'
          )}
        >
          {selectedBet === 'ANDAR' && (
            <div className="absolute inset-0 bg-gradient-to-b from-teal-500/10 to-transparent" />
          )}
          <div className="relative z-10">
            <span className="text-2xl font-black text-foreground block leading-none">A</span>
            <span className="text-xs font-bold text-foreground block mt-1">Andar</span>
            <span className={cn('text-[11px] font-bold block mt-0.5', selectedBet === 'ANDAR' ? 'text-teal-600' : 'text-muted-foreground')}>1.90x</span>
          </div>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.04, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelectBet('BAHAR')}
          disabled={isPlaying}
          className={cn(
            'p-3.5 rounded-2xl border-2 text-center transition-all relative overflow-hidden',
            selectedBet === 'BAHAR'
              ? 'border-orange-400 ring-2 ring-orange-400/40 shadow-lg bg-card'
              : 'border-border bg-card hover:border-orange-300',
            isPlaying && 'opacity-50 cursor-not-allowed'
          )}
        >
          {selectedBet === 'BAHAR' && (
            <div className="absolute inset-0 bg-gradient-to-b from-orange-500/10 to-transparent" />
          )}
          <div className="relative z-10">
            <span className="text-2xl font-black text-foreground block leading-none">B</span>
            <span className="text-xs font-bold text-foreground block mt-1">Bahar</span>
            <span className={cn('text-[11px] font-bold block mt-0.5', selectedBet === 'BAHAR' ? 'text-orange-600' : 'text-muted-foreground')}>2.00x</span>
          </div>
        </motion.button>
      </div>
    </div>
  );
}
