'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

interface DiceGameProps {
  result: { dice1: number; dice2: number; total: number } | null;
  selectedBet: string;
  onSelectBet: (betType: string) => void;
  isPlaying: boolean;
}

// ─── Dot layout maps for each die face (1-6) ────────────────────────────────
// Positions are expressed as [row, col] on a 3x3 grid where
// 0 = top/left, 1 = center, 2 = bottom/right

const DOT_POSITIONS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 2], [2, 0]],
  3: [[0, 2], [1, 1], [2, 0]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};

// ─── Single Die Face ─────────────────────────────────────────────────────────

function DieFace({ value, size = 64 }: { value: number; size?: number }) {
  const dots = DOT_POSITIONS[value] || [];
  const dotSize = Math.round(size * 0.16);
  const padding = Math.round(size * 0.18);
  const gap = (size - padding * 2 - dotSize) / 2;

  return (
    <div
      className="relative"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.18,
        background: 'linear-gradient(145deg, #ffffff 0%, #e8e8e8 50%, #d4d4d4 100%)',
        boxShadow: `
          ${size * 0.03}px ${size * 0.05}px ${size * 0.12}px rgba(0,0,0,0.45),
          inset 0 ${size * 0.02}px ${size * 0.04}px rgba(255,255,255,0.8),
          inset 0 -${size * 0.015}px ${size * 0.03}px rgba(0,0,0,0.1)
        `,
        transform: 'perspective(200px) rotateX(5deg)',
      }}
    >
      {dots.map(([row, col], i) => {
        const left = padding + col * gap;
        const top = padding + row * gap;
        return (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: dotSize,
              height: dotSize,
              left,
              top,
              background: 'radial-gradient(circle at 35% 35%, #444 0%, #1a1a1a 70%, #000 100%)',
              boxShadow: `inset 0 ${dotSize * 0.1}px ${dotSize * 0.15}px rgba(255,255,255,0.15),
                          0 ${dotSize * 0.05}px ${dotSize * 0.1}px rgba(0,0,0,0.3)`,
            }}
          />
        );
      })}
    </div>
  );
}

// ─── Main Dice Game Component ────────────────────────────────────────────────

export default function DiceGame({
  result,
  selectedBet,
  onSelectBet,
  isPlaying,
}: DiceGameProps) {
  // Randomised values displayed while shaking
  const [displayDice, setDisplayDice] = useState<[number, number]>([1, 1]);
  // Controls the "reveal / settle" phase after shaking stops
  const [revealed, setRevealed] = useState(false);
  // Track previous isPlaying to detect transitions
  const [wasPlaying, setWasPlaying] = useState(false);

  // ── Rapid random roll while shaking ──────────────────────────────────────
  useEffect(() => {
    if (!isPlaying) return;
    setRevealed(false);
    const interval = setInterval(() => {
      setDisplayDice([
        Math.ceil(Math.random() * 6),
        Math.ceil(Math.random() * 6),
      ]);
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // ── Detect when playing stops -> trigger reveal ──────────────────────────
  useEffect(() => {
    if (wasPlaying && !isPlaying && result) {
      // Short pause then reveal final result
      const timer = setTimeout(() => {
        setDisplayDice([result.dice1, result.dice2]);
        setRevealed(true);
      }, 200);
      return () => clearTimeout(timer);
    }
    setWasPlaying(isPlaying);
  }, [isPlaying, wasPlaying, result]);

  // On mount or when result changes directly (e.g. page load with existing result)
  useEffect(() => {
    if (result && !isPlaying) {
      setDisplayDice([result.dice1, result.dice2]);
      setRevealed(true);
    }
  }, [result, isPlaying]);

  // ── Derived values ───────────────────────────────────────────────────────
  const showResult = revealed && result;
  const totalColor = showResult
    ? result.total < 7
      ? '#3b82f6'  // blue
      : result.total === 7
      ? '#eab308'  // gold
      : '#ef4444'  // red
    : '#a1a1aa';

  const totalLabel = showResult
    ? result.total < 7
      ? 'Under 7'
      : result.total === 7
      ? 'Lucky 7!'
      : 'Over 7'
    : null;

  // ── Bet options ──────────────────────────────────────────────────────────
  const betOptions = [
    {
      id: 'UNDER',
      label: 'Under 7',
      multiplier: '2.30x',
      gradient: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
      hoverGradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      ring: 'ring-blue-500/50',
    },
    {
      id: 'EXACT',
      label: 'Exact 7',
      multiplier: '5.50x',
      gradient: 'linear-gradient(135deg, #ca8a04 0%, #a16207 100%)',
      hoverGradient: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
      ring: 'ring-yellow-500/50',
    },
    {
      id: 'OVER',
      label: 'Over 7',
      multiplier: '2.30x',
      gradient: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
      hoverGradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      ring: 'ring-red-500/50',
    },
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="flex flex-col items-center gap-6 select-none">

      {/* ── Dice Cup / Bowl Container ──────────────────────────────────────── */}
      <div className="relative flex flex-col items-center">
        {/* Bowl label */}
        <motion.div
          className="text-xs uppercase tracking-widest text-muted-foreground mb-2 font-semibold"
          animate={isPlaying ? { opacity: [0.5, 1, 0.5] } : { opacity: 0.7 }}
          transition={isPlaying ? { duration: 0.6, repeat: Infinity } : {}}
        >
          {isPlaying ? 'Rolling...' : showResult ? 'Result' : 'Place your bet'}
        </motion.div>

        {/* The bowl itself */}
        <motion.div
          className="relative overflow-hidden"
          style={{
            width: 200,
            height: 120,
            borderRadius: '16px 16px 50px 50px',
            background: 'linear-gradient(180deg, rgba(30,30,30,0.85) 0%, rgba(15,15,15,0.95) 100%)',
            border: '2px solid transparent',
            backgroundClip: 'padding-box',
          }}
          animate={
            isPlaying
              ? {
                  rotate: [0, -1.5, 1.5, -1, 1, 0],
                  y: [0, -2, 2, -1, 1, 0],
                }
              : { rotate: 0, y: 0 }
          }
          transition={
            isPlaying
              ? { duration: 0.3, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0.4, ease: 'easeOut' }
          }
        >
          {/* Gradient border ring */}
          <div
            className="absolute inset-0 -z-10"
            style={{
              margin: -2,
              borderRadius: '18px 18px 52px 52px',
              background:
                'linear-gradient(180deg, rgba(120,120,120,0.5) 0%, rgba(80,80,80,0.8) 50%, rgba(50,50,50,0.6) 100%)',
            }}
          />

          {/* Inner shadow / gloss for depth */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              borderRadius: '14px 14px 48px 48px',
              boxShadow:
                'inset 0 8px 20px rgba(0,0,0,0.5), inset 0 -4px 12px rgba(255,255,255,0.04)',
            }}
          />

          {/* Floor glow when shaking */}
          <AnimatePresence>
            {isPlaying && (
              <motion.div
                className="absolute bottom-0 left-1/2 -translate-x-1/2"
                style={{
                  width: 120,
                  height: 30,
                  borderRadius: '50%',
                  background: 'radial-gradient(ellipse, rgba(250,204,21,0.15) 0%, transparent 70%)',
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, repeat: Infinity }}
              />
            )}
          </AnimatePresence>

          {/* ── Dice inside the bowl ─────────────────────────────────────── */}
          <div className="flex items-center justify-center gap-4 w-full h-full relative">
            {/* Die 1 */}
            <motion.div
              animate={
                isPlaying
                  ? {
                      x: [0, -6, 8, -4, 5, 0],
                      y: [0, -8, 4, -6, 2, 0],
                      rotate: [0, -25, 30, -15, 20, 0],
                      scale: [1, 0.92, 1.05, 0.95, 1.02, 1],
                    }
                  : revealed
                  ? { x: 0, y: 0, rotate: 0, scale: 1 }
                  : {}
              }
              transition={
                isPlaying
                  ? { duration: 0.25, repeat: Infinity, ease: 'easeInOut' }
                  : {
                      type: 'spring',
                      stiffness: 300,
                      damping: 15,
                      mass: 0.8,
                    }
              }
            >
              <DieFace value={displayDice[0]} size={52} />
            </motion.div>

            {/* Die 2 */}
            <motion.div
              animate={
                isPlaying
                  ? {
                      x: [0, 7, -5, 6, -3, 0],
                      y: [0, -5, 6, -8, 3, 0],
                      rotate: [0, 20, -30, 18, -22, 0],
                      scale: [1, 1.04, 0.93, 1.02, 0.96, 1],
                    }
                  : revealed
                  ? { x: 0, y: 0, rotate: 0, scale: 1 }
                  : {}
              }
              transition={
                isPlaying
                  ? {
                      duration: 0.28,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: 0.05,
                    }
                  : {
                      type: 'spring',
                      stiffness: 300,
                      damping: 15,
                      mass: 0.8,
                    }
              }
            >
              <DieFace value={displayDice[1]} size={52} />
            </motion.div>
          </div>
        </motion.div>

        {/* Bowl stand / shadow */}
        <div
          className="mt-1"
          style={{
            width: 160,
            height: 8,
            borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(0,0,0,0.35) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* ── Result Total Display ───────────────────────────────────────────── */}
      <div className="h-20 flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {showResult && (
            <motion.div
              key={`${result.dice1}-${result.dice2}`}
              className="flex flex-col items-center gap-1"
              initial={{ opacity: 0, scale: 0.3, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 20,
                mass: 0.6,
              }}
            >
              {/* Total number */}
              <motion.span
                className="text-5xl font-black tabular-nums"
                style={{
                  color: totalColor,
                  textShadow: `0 0 20px ${totalColor}44, 0 2px 8px rgba(0,0,0,0.5)`,
                }}
                initial={{ scale: 1.6 }}
                animate={{ scale: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 500,
                  damping: 18,
                  delay: 0.1,
                }}
              >
                {result.total}
              </motion.span>

              {/* Label under total */}
              <motion.span
                className="text-sm font-bold uppercase tracking-wider"
                style={{ color: totalColor }}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                {totalLabel}
              </motion.span>

              {/* Individual dice readout */}
              <motion.span
                className="text-xs text-muted-foreground mt-0.5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
              >
                {result.dice1} + {result.dice2}
              </motion.span>
            </motion.div>
          )}

          {!showResult && !isPlaying && (
            <motion.div
              key="idle"
              className="flex flex-col items-center gap-1 text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <span className="text-3xl font-bold">?</span>
              <span className="text-xs uppercase tracking-wider">
                Roll the dice
              </span>
            </motion.div>
          )}

          {isPlaying && (
            <motion.div
              key="rolling"
              className="flex items-center gap-1.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-yellow-500"
                  animate={{ y: [0, -8, 0] }}
                  transition={{
                    duration: 0.5,
                    repeat: Infinity,
                    delay: i * 0.12,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Bet Selection Buttons ──────────────────────────────────────────── */}
      <div className="flex gap-3 w-full max-w-sm">
        {betOptions.map((opt) => {
          const isSelected = selectedBet === opt.id;
          return (
            <motion.button
              key={opt.id}
              onClick={() => onSelectBet(opt.id)}
              disabled={isPlaying}
              className={cn(
                'relative flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-xl',
                'font-semibold transition-all duration-200',
                'disabled:opacity-40 disabled:cursor-not-allowed',
                isSelected && `ring-2 ${opt.ring}`,
              )}
              style={{
                background: isSelected ? opt.hoverGradient : opt.gradient,
              }}
              whileHover={!isPlaying ? { scale: 1.04, y: -2 } : {}}
              whileTap={!isPlaying ? { scale: 0.97 } : {}}
            >
              {/* Selection indicator */}
              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  >
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                  </motion.div>
                )}
              </AnimatePresence>

              <span className="text-white text-sm font-bold leading-tight">
                {opt.label}
              </span>
              <span
                className="text-xs font-mono font-bold"
                style={{
                  color: 'rgba(255,255,255,0.75)',
                }}
              >
                {opt.multiplier}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* ── Win / Loss indicator flash ─────────────────────────────────────── */}
      <AnimatePresence>
        {showResult && selectedBet && (
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.4 }}
          >
            {(selectedBet === 'UNDER' && result.total < 7) ||
            (selectedBet === 'EXACT' && result.total === 7) ||
            (selectedBet === 'OVER' && result.total > 7) ? (
              <motion.span
                className="text-green-400 font-bold text-lg"
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 0.5, repeat: 2 }}
              >
                WIN
              </motion.span>
            ) : (
              <span className="text-red-400 font-semibold text-lg">LOSS</span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
