'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CoinFlipGameProps {
  result: any | null; // { outcome: 'HEADS' | 'TAILS', value: number }
  selectedBet: string;
  onSelectBet: (betType: string) => void;
  isPlaying: boolean;
}

// ---------------------------------------------------------------------------
// SVG sub-components for coin faces
// ---------------------------------------------------------------------------

function HeadsFace() {
  return (
    <svg viewBox="0 0 120 120" className="w-full h-full">
      <defs>
        <radialGradient id="gold-radial" cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#fff4a3" />
          <stop offset="30%" stopColor="#ffd700" />
          <stop offset="70%" stopColor="#c9a000" />
          <stop offset="100%" stopColor="#8a6e00" />
        </radialGradient>
        <radialGradient id="gold-inner" cx="50%" cy="45%" r="45%">
          <stop offset="0%" stopColor="#ffe566" />
          <stop offset="100%" stopColor="#b8860b" />
        </radialGradient>
        <filter id="heads-shadow">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#000" floodOpacity="0.3" />
        </filter>
      </defs>

      {/* Outer ring */}
      <circle cx="60" cy="60" r="58" fill="url(#gold-radial)" stroke="#8a6e00" strokeWidth="1" />

      {/* Outer decorative ring */}
      <circle cx="60" cy="60" r="52" fill="none" stroke="#b8860b" strokeWidth="1.5" opacity="0.6" />

      {/* Dot pattern around edge */}
      {Array.from({ length: 24 }).map((_, i) => {
        const angle = (i * 15 * Math.PI) / 180;
        const cx = 60 + 55 * Math.cos(angle);
        const cy = 60 + 55 * Math.sin(angle);
        return <circle key={i} cx={cx} cy={cy} r="1.2" fill="#8a6e00" opacity="0.5" />;
      })}

      {/* Inner field */}
      <circle cx="60" cy="60" r="46" fill="url(#gold-inner)" />

      {/* Inner ring detail */}
      <circle cx="60" cy="60" r="46" fill="none" stroke="#daa520" strokeWidth="1" opacity="0.5" />

      {/* Crown icon */}
      <g transform="translate(60, 30)" filter="url(#heads-shadow)">
        <path
          d="M-12,6 L-10,-4 L-5,2 L0,-8 L5,2 L10,-4 L12,6 Z"
          fill="#ffd700"
          stroke="#8a6e00"
          strokeWidth="0.8"
        />
        <rect x="-12" y="6" width="24" height="4" rx="1" fill="#ffd700" stroke="#8a6e00" strokeWidth="0.8" />
        {/* Crown gems */}
        <circle cx="-5" cy="1" r="1.5" fill="#ff4444" opacity="0.8" />
        <circle cx="0" cy="-4" r="1.5" fill="#4488ff" opacity="0.8" />
        <circle cx="5" cy="1" r="1.5" fill="#44cc44" opacity="0.8" />
      </g>

      {/* Big S letter */}
      <text
        x="60"
        y="72"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="36"
        fontWeight="bold"
        fontFamily="Georgia, serif"
        fill="#8a6e00"
        filter="url(#heads-shadow)"
        opacity="0.9"
      >
        S
      </text>

      {/* Stake text at bottom */}
      <text
        x="60"
        y="96"
        textAnchor="middle"
        fontSize="8"
        fontWeight="600"
        fontFamily="Arial, sans-serif"
        fill="#8a6e00"
        letterSpacing="2"
        opacity="0.7"
      >
        STAKE111
      </text>

      {/* Highlight arc */}
      <path
        d="M 30 25 A 50 50 0 0 1 90 25"
        fill="none"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TailsFace() {
  return (
    <svg viewBox="0 0 120 120" className="w-full h-full">
      <defs>
        <radialGradient id="silver-radial" cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="30%" stopColor="#d4d4d8" />
          <stop offset="70%" stopColor="#a1a1aa" />
          <stop offset="100%" stopColor="#71717a" />
        </radialGradient>
        <radialGradient id="silver-inner" cx="50%" cy="45%" r="45%">
          <stop offset="0%" stopColor="#e4e4e7" />
          <stop offset="100%" stopColor="#9ca3af" />
        </radialGradient>
        <filter id="tails-shadow">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#000" floodOpacity="0.3" />
        </filter>
        {/* Diamond pattern */}
        <pattern id="diamond-pattern" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
          <path d="M6,0 L12,6 L6,12 L0,6 Z" fill="none" stroke="#71717a" strokeWidth="0.4" opacity="0.3" />
        </pattern>
      </defs>

      {/* Outer ring */}
      <circle cx="60" cy="60" r="58" fill="url(#silver-radial)" stroke="#71717a" strokeWidth="1" />

      {/* Outer decorative ring */}
      <circle cx="60" cy="60" r="52" fill="none" stroke="#9ca3af" strokeWidth="1.5" opacity="0.6" />

      {/* Dot pattern around edge */}
      {Array.from({ length: 24 }).map((_, i) => {
        const angle = (i * 15 * Math.PI) / 180;
        const cx = 60 + 55 * Math.cos(angle);
        const cy = 60 + 55 * Math.sin(angle);
        return <circle key={i} cx={cx} cy={cy} r="1.2" fill="#71717a" opacity="0.5" />;
      })}

      {/* Inner field with diamond pattern */}
      <circle cx="60" cy="60" r="46" fill="url(#silver-inner)" />
      <circle cx="60" cy="60" r="46" fill="url(#diamond-pattern)" />

      {/* Inner ring detail */}
      <circle cx="60" cy="60" r="46" fill="none" stroke="#a1a1aa" strokeWidth="1" opacity="0.5" />

      {/* Diamond icon at top */}
      <g transform="translate(60, 28)" filter="url(#tails-shadow)">
        <path
          d="M0,-10 L10,0 L0,12 L-10,0 Z"
          fill="#c0c0c0"
          stroke="#71717a"
          strokeWidth="0.8"
        />
        <path d="M0,-10 L3,0 L0,12" fill="rgba(255,255,255,0.3)" />
        <path d="M0,-10 L-3,0 L0,12" fill="rgba(0,0,0,0.1)" />
      </g>

      {/* 111 text */}
      <text
        x="60"
        y="72"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="32"
        fontWeight="bold"
        fontFamily="Georgia, serif"
        fill="#52525b"
        filter="url(#tails-shadow)"
        opacity="0.9"
      >
        111
      </text>

      {/* Tails label at bottom */}
      <text
        x="60"
        y="96"
        textAnchor="middle"
        fontSize="8"
        fontWeight="600"
        fontFamily="Arial, sans-serif"
        fill="#71717a"
        letterSpacing="2"
        opacity="0.7"
      >
        TAILS
      </text>

      {/* Highlight arc */}
      <path
        d="M 30 25 A 50 50 0 0 1 90 25"
        fill="none"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Edge strip for pseudo-3D thickness
// ---------------------------------------------------------------------------

function CoinEdge() {
  return (
    <div
      className="absolute inset-0 rounded-full pointer-events-none"
      style={{
        background:
          'linear-gradient(90deg, #8a6e00 0%, #c9a000 15%, #ffd700 30%, #c9a000 50%, #8a6e00 70%, #6b5600 100%)',
        transform: 'scaleX(1.04)',
        zIndex: -1,
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function CoinFlipGame({
  result,
  selectedBet,
  onSelectBet,
  isPlaying,
}: CoinFlipGameProps) {
  const [showResult, setShowResult] = useState(false);
  const [hasLanded, setHasLanded] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [displayedSide, setDisplayedSide] = useState<'HEADS' | 'TAILS'>('HEADS');

  // Total spin duration in seconds
  const THROW_DURATION = 1.6;
  const LAND_BOUNCE_DURATION = 0.5;

  // When playing starts, reset and trigger flip
  useEffect(() => {
    if (isPlaying) {
      setShowResult(false);
      setHasLanded(false);
      setIsFlipping(true);
    }
  }, [isPlaying]);

  // When result arrives, set displayed side and schedule landing
  useEffect(() => {
    if (result && !isPlaying && isFlipping) {
      setDisplayedSide(result.outcome);
      const timer = setTimeout(() => {
        setHasLanded(true);
        setIsFlipping(false);
        setTimeout(() => setShowResult(true), 300);
      }, (THROW_DURATION + LAND_BOUNCE_DURATION) * 1000);
      return () => clearTimeout(timer);
    }
  }, [result, isPlaying, isFlipping]);

  // Reset when no result
  useEffect(() => {
    if (!isPlaying && !result) {
      setShowResult(false);
      setHasLanded(false);
      setIsFlipping(false);
      setDisplayedSide('HEADS');
    }
  }, [isPlaying, result]);

  // Determine if outcome is the currently-displayed face (for landing rotation)
  const isTails = displayedSide === 'TAILS';

  // We compute a final Y-rotation so the desired face is up.
  // Heads = 0deg face, Tails = 180deg face.
  // We want total rotations to be 5+ full spins (1800deg+) and end on correct face.
  const baseSpin = 1800; // 5 full rotations
  const finalRotation = isTails ? baseSpin + 180 : baseSpin;

  return (
    <div className="flex flex-col items-center gap-6 select-none">
      {/* ---------------------------------------------------------------- */}
      {/* Coin Area                                                         */}
      {/* ---------------------------------------------------------------- */}
      <div className="relative flex items-center justify-center" style={{ height: 240, width: 140 }}>
        {/* Shadow on the ground */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 100,
            height: 16,
            bottom: 20,
            background: 'radial-gradient(ellipse, rgba(0,0,0,0.35) 0%, transparent 70%)',
            filter: 'blur(2px)',
          }}
          animate={
            isFlipping
              ? {
                  // Shadow shrinks when coin goes up, grows when it comes back
                  scale: [1, 0.4, 0.4, 1, 1.15, 1],
                  opacity: [0.7, 0.25, 0.25, 0.8, 0.9, 0.7],
                }
              : hasLanded
                ? { scale: 1, opacity: 0.7 }
                : { scale: 1, opacity: 0.5 }
          }
          transition={
            isFlipping
              ? {
                  duration: THROW_DURATION + LAND_BOUNCE_DURATION,
                  times: [0, 0.2, 0.55, 0.78, 0.88, 1],
                  ease: 'easeInOut',
                }
              : { duration: 0.3 }
          }
        />

        {/* Coin container - handles the vertical throw (translateY) */}
        <motion.div
          className="absolute"
          style={{ width: 120, height: 120, perspective: 800 }}
          animate={
            isFlipping
              ? {
                  // Throw up then come back down with a small bounce
                  y: [0, -100, -100, 0, -12, 0],
                }
              : { y: 0 }
          }
          transition={
            isFlipping
              ? {
                  duration: THROW_DURATION + LAND_BOUNCE_DURATION,
                  times: [0, 0.2, 0.55, 0.78, 0.88, 1],
                  ease: [0.33, 0, 0.67, 1],
                }
              : { duration: 0.3 }
          }
        >
          {/* Inner wrapper - handles the 3D Y-axis rotation */}
          <motion.div
            className="w-full h-full relative"
            style={{ transformStyle: 'preserve-3d' }}
            animate={
              isFlipping
                ? { rotateY: finalRotation }
                : hasLanded
                  ? { rotateY: isTails ? 180 : 0 }
                  : { rotateY: 0 }
            }
            transition={
              isFlipping
                ? {
                    duration: THROW_DURATION,
                    ease: [0.2, 0.8, 0.4, 1], // fast start, decelerate
                  }
                : { duration: 0.4 }
            }
          >
            {/* Heads face (front) */}
            <div
              className="absolute inset-0 rounded-full overflow-hidden"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3), inset 0 0 15px rgba(255,215,0,0.15)',
              }}
            >
              <HeadsFace />
            </div>

            {/* Coin edge (pseudo-3D thickness) */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                transform: 'translateZ(-2px)',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
              }}
            >
              <CoinEdge />
            </div>

            {/* Tails face (back) */}
            <div
              className="absolute inset-0 rounded-full overflow-hidden"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3), inset 0 0 15px rgba(192,192,192,0.15)',
              }}
            >
              <TailsFace />
            </div>

            {/* Tails-side edge */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                transform: 'rotateY(180deg) translateZ(-2px)',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                background:
                  'linear-gradient(90deg, #52525b 0%, #a1a1aa 20%, #d4d4d8 40%, #a1a1aa 60%, #52525b 80%, #3f3f46 100%)',
              }}
            />
          </motion.div>
        </motion.div>

        {/* Sparkle particles on landing */}
        <AnimatePresence>
          {hasLanded && (
            <>
              {Array.from({ length: 8 }).map((_, i) => {
                const angle = (i * 45 * Math.PI) / 180;
                const dist = 50 + Math.random() * 20;
                return (
                  <motion.div
                    key={`sparkle-${i}`}
                    className="absolute rounded-full"
                    style={{
                      width: 4,
                      height: 4,
                      background: isTails ? '#d4d4d8' : '#ffd700',
                    }}
                    initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                    animate={{
                      x: Math.cos(angle) * dist,
                      y: Math.sin(angle) * dist - 20,
                      opacity: 0,
                      scale: 0,
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                );
              })}
            </>
          )}
        </AnimatePresence>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Result Text                                                       */}
      {/* ---------------------------------------------------------------- */}
      <div className="h-10 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {showResult && result && (
            <motion.div
              key={result.outcome}
              initial={{ opacity: 0, scale: 0.5, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              className={cn(
                'text-2xl font-extrabold tracking-widest',
                result.outcome === 'HEADS'
                  ? 'text-yellow-600 dark:text-yellow-400 drop-shadow-[0_0_12px_rgba(255,215,0,0.6)]'
                  : 'text-gray-600 dark:text-zinc-300 drop-shadow-[0_0_12px_rgba(212,212,216,0.6)]',
              )}
            >
              {result.outcome}!
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Bet Selection Cards                                               */}
      {/* ---------------------------------------------------------------- */}
      <div className="flex gap-4 w-full max-w-xs">
        {/* Heads card */}
        <motion.button
          onClick={() => onSelectBet('HEADS')}
          disabled={isPlaying}
          whileHover={!isPlaying ? { scale: 1.04 } : {}}
          whileTap={!isPlaying ? { scale: 0.97 } : {}}
          className={cn(
            'relative flex-1 rounded-xl p-4 flex flex-col items-center gap-2 border-2 transition-colors duration-200 overflow-hidden',
            'disabled:cursor-not-allowed',
            selectedBet === 'HEADS'
              ? 'border-yellow-500/80 bg-yellow-500/10'
              : 'border-border bg-card hover:border-muted-foreground/30',
          )}
        >
          {/* Glow effect when selected */}
          {selectedBet === 'HEADS' && (
            <motion.div
              className="absolute inset-0 rounded-xl pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                boxShadow: '0 0 25px rgba(255, 215, 0, 0.25), inset 0 0 25px rgba(255, 215, 0, 0.08)',
              }}
            />
          )}

          {/* Mini coin icon */}
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
            style={{
              background: 'linear-gradient(135deg, #ffd700, #b8860b)',
              color: '#5c4300',
              boxShadow: '0 2px 8px rgba(255,215,0,0.3)',
            }}
          >
            S
          </div>

          <span
            className={cn(
              'text-sm font-semibold tracking-wide',
              selectedBet === 'HEADS' ? 'text-yellow-600 dark:text-yellow-400' : 'text-muted-foreground',
            )}
          >
            HEADS
          </span>

          {/* Subtle gradient bar at bottom */}
          <div
            className={cn(
              'absolute bottom-0 left-0 right-0 h-0.5',
              selectedBet === 'HEADS' ? 'opacity-100' : 'opacity-0',
            )}
            style={{
              background: 'linear-gradient(90deg, transparent, #ffd700, transparent)',
              transition: 'opacity 0.3s',
            }}
          />
        </motion.button>

        {/* Tails card */}
        <motion.button
          onClick={() => onSelectBet('TAILS')}
          disabled={isPlaying}
          whileHover={!isPlaying ? { scale: 1.04 } : {}}
          whileTap={!isPlaying ? { scale: 0.97 } : {}}
          className={cn(
            'relative flex-1 rounded-xl p-4 flex flex-col items-center gap-2 border-2 transition-colors duration-200 overflow-hidden',
            'disabled:cursor-not-allowed',
            selectedBet === 'TAILS'
              ? 'border-zinc-400/80 bg-zinc-400/10'
              : 'border-border bg-card hover:border-muted-foreground/30',
          )}
        >
          {/* Glow effect when selected */}
          {selectedBet === 'TAILS' && (
            <motion.div
              className="absolute inset-0 rounded-xl pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                boxShadow: '0 0 25px rgba(212, 212, 216, 0.2), inset 0 0 25px rgba(212, 212, 216, 0.06)',
              }}
            />
          )}

          {/* Mini coin icon */}
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs"
            style={{
              background: 'linear-gradient(135deg, #d4d4d8, #71717a)',
              color: '#3f3f46',
              boxShadow: '0 2px 8px rgba(161,161,170,0.3)',
            }}
          >
            111
          </div>

          <span
            className={cn(
              'text-sm font-semibold tracking-wide',
              selectedBet === 'TAILS' ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            TAILS
          </span>

          {/* Subtle gradient bar at bottom */}
          <div
            className={cn(
              'absolute bottom-0 left-0 right-0 h-0.5',
              selectedBet === 'TAILS' ? 'opacity-100' : 'opacity-0',
            )}
            style={{
              background: 'linear-gradient(90deg, transparent, #d4d4d8, transparent)',
              transition: 'opacity 0.3s',
            }}
          />
        </motion.button>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Win/Loss indicator                                                */}
      {/* ---------------------------------------------------------------- */}
      <AnimatePresence>
        {showResult && result && selectedBet && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className={cn(
              'text-sm font-semibold px-4 py-1.5 rounded-full',
              result.outcome === selectedBet
                ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30'
                : 'bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400 ring-1 ring-red-500/30',
            )}
          >
            {result.outcome === selectedBet ? (
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                You won +{result.value}
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                You lost -{result.value}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
