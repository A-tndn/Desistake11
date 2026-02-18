'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { casinoService } from '@/services/casino.service';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import CoinFlipGame from '@/components/casino/CoinFlipGame';
import DiceGame from '@/components/casino/DiceGame';
import HiLoGame from '@/components/casino/HiLoGame';
import CardGame from '@/components/casino/CardGame';
import AndarBaharGame from '@/components/casino/AndarBaharGame';
import { ArrowLeft, History, Shield, Wallet, Sparkles, X, ChevronUp, ChevronDown } from 'lucide-react';

const CHIP_AMOUNTS = [100, 500, 1000, 5000, 10000];

// Stake111 branded chip
function Chip({ amount, selected, onClick, disabled }: {
  amount: number; selected: boolean; onClick: () => void; disabled: boolean;
}) {
  const label = amount >= 1000 ? `${amount / 1000}K` : String(amount);
  const colors = selected
    ? 'from-brand-teal to-emerald-600 border-brand-teal shadow-brand-teal/40'
    : 'from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 border-gray-300 dark:border-gray-600';

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'relative w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all',
        `bg-gradient-to-b ${colors}`,
        selected ? 'shadow-lg scale-110' : 'shadow-sm hover:scale-105',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {/* Chip edge notches */}
      <div className="absolute inset-0 rounded-full overflow-hidden">
        {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => (
          <div
            key={deg}
            className={cn(
              'absolute w-1 h-2.5 rounded-full',
              selected ? 'bg-white/30' : 'bg-gray-400/20 dark:bg-gray-500/20'
            )}
            style={{
              top: '50%',
              left: '50%',
              transform: `rotate(${deg}deg) translate(-50%, -22px)`,
              transformOrigin: '50% 50%',
            }}
          />
        ))}
      </div>
      {/* Inner ring */}
      <div className={cn(
        'absolute inset-1.5 rounded-full border',
        selected ? 'border-white/30' : 'border-gray-400/20 dark:border-gray-500/30'
      )} />
      {/* Label */}
      <span className={cn(
        'relative z-10 text-[11px] font-black',
        selected ? 'text-white' : 'text-foreground'
      )}>
        {label}
      </span>
    </motion.button>
  );
}

// Confetti particles
function Confetti({ show }: { show: boolean }) {
  if (!show) return null;
  const colors = ['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899'];
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {Array.from({ length: 30 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{
            x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 400),
            y: -20, rotate: 0, opacity: 1,
          }}
          animate={{
            y: (typeof window !== 'undefined' ? window.innerHeight : 800) + 50,
            rotate: Math.random() * 720 - 360, opacity: 0,
          }}
          transition={{ duration: 2 + Math.random() * 2, delay: Math.random() * 0.5, ease: 'easeIn' }}
          className="absolute w-2.5 h-2.5 rounded-sm"
          style={{ backgroundColor: colors[i % colors.length], left: `${Math.random() * 100}%` }}
        />
      ))}
    </div>
  );
}

function getOddsForBet(gameType: string, betType: string): number {
  if (gameType === 'HI_LO' && betType === 'EXACT') return 12.0;
  if (gameType === 'HI_LO') return 2.05;
  if (gameType === 'DICE_ROLL' && betType === 'EXACT') return 5.5;
  if (gameType === 'DICE_ROLL') return 2.30;
  if (gameType === 'ANDAR_BAHAR' && betType === 'ANDAR') return 1.90;
  if (gameType === 'ANDAR_BAHAR' && betType === 'BAHAR') return 2.00;
  return 1.95;
}

function getOutcomeLabel(r: any, gameType: string): string {
  if (!r?.result) return '';
  const res = r.result;
  if (gameType === 'COIN_FLIP') return res.outcome || '';
  if (gameType === 'HI_LO') return `${res.cardName || ''} ${res.suit || ''} (${res.value || ''})`;
  if (gameType === 'DICE_ROLL') return `${res.dice1 || 0}+${res.dice2 || 0}=${res.total || 0}`;
  if (gameType === 'ANDAR_BAHAR') return `${res.winner || ''} (${res.totalDealt || 0} cards)`;
  if (gameType === 'TEEN_PATTI' || gameType === 'INDIAN_POKER') return res.winner === 'PLAYER_A' ? 'Player Won' : 'Dealer Won';
  return '';
}

export default function GamePlayPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;
  const { user, updateBalance } = useAuthStore();

  const [game, setGame] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [selectedBet, setSelectedBet] = useState('');
  const [amount, setAmount] = useState(100);
  const [result, setResult] = useState<any>(null);
  const [lastResults, setLastResults] = useState<any[]>([]);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showHistory, setShowHistory] = useState(false);
  const [betHistory, setBetHistory] = useState<any[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [expandedResult, setExpandedResult] = useState<number | null>(null);

  useEffect(() => { loadGame(); }, [gameId]);

  // Hide bottom nav when on casino game page
  useEffect(() => {
    const bottomNav = document.querySelector('nav.fixed.bottom-0');
    if (bottomNav) (bottomNav as HTMLElement).style.display = 'none';
    return () => {
      if (bottomNav) (bottomNav as HTMLElement).style.display = '';
    };
  }, []);

  const loadGame = async () => {
    try {
      const res: any = await casinoService.getGameById(gameId);
      setGame(res?.data || null);
    } catch { setMessage({ type: 'error', text: 'Game not found' }); }
    finally { setLoading(false); }
  };

  const loadBetHistory = async () => {
    try {
      const res: any = await casinoService.getBetHistory({ limit: 20 });
      const bets = res?.data?.bets || [];
      setBetHistory(bets.filter((b: any) => b.round?.game?.gameType === game?.gameType));
    } catch { /* silent */ }
  };

  const handlePlay = async () => {
    if (!selectedBet) { setMessage({ type: 'error', text: 'Select a bet option' }); return; }
    if (amount < Number(game?.minBet || 10)) { setMessage({ type: 'error', text: `Min bet: \u20B9${game?.minBet || 10}` }); return; }
    if (amount > Number(game?.maxBet || 10000)) { setMessage({ type: 'error', text: `Max bet: \u20B9${game?.maxBet || 10000}` }); return; }
    if ((user?.balance || 0) < amount) { setMessage({ type: 'error', text: 'Insufficient balance' }); return; }

    setPlaying(true);
    setResult(null);
    setMessage({ type: '', text: '' });
    setShowConfetti(false);

    try {
      const res: any = await casinoService.instantPlay({ gameId, betType: selectedBet, amount });
      const data = res?.data;

      // Wait for animation
      await new Promise(r => setTimeout(r, 1800));

      setResult(data?.result);
      updateBalance(data?.newBalance);

      const actualWin = Number(data?.bet?.actualWin || 0);
      const betAmount = Number(data?.bet?.amount || amount);

      if (data?.isWinner) {
        const profit = Math.round((actualWin - betAmount) * 100) / 100;
        setMessage({ type: 'success', text: `Won ${formatCurrency(profit)}!` });
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      } else {
        setMessage({ type: 'error', text: `Lost ${formatCurrency(betAmount)}` });
      }

      setLastResults(prev => [{
        result: data?.result,
        isWinner: data?.isWinner,
        amount: betAmount,
        win: actualWin,
        profit: data?.isWinner ? Math.round((actualWin - betAmount) * 100) / 100 : -betAmount,
        betType: selectedBet,
        gameType: game?.gameType,
      }, ...prev].slice(0, 10));
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to play' });
    } finally {
      setPlaying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}
          className="text-brand-teal text-lg font-medium">Loading...</motion.div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Game not found</p>
        <button onClick={() => router.back()} className="mt-2 text-brand-teal text-sm hover:underline">Go back</button>
      </div>
    );
  }

  const gameType = game.gameType;
  const odds = getOddsForBet(gameType, selectedBet);

  return (
    <div className="max-w-lg mx-auto pb-4 min-h-[calc(100vh-3.5rem)] flex flex-col">
      <Confetti show={showConfetti} />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 sticky top-0 z-30 bg-background/80 backdrop-blur-sm">
        <motion.button whileTap={{ scale: 0.9 }}
          onClick={() => router.push('/casino')}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition">
          <ArrowLeft className="w-4 h-4" /> Casino
        </motion.button>
        <motion.button whileTap={{ scale: 0.9 }}
          onClick={() => { setShowHistory(!showHistory); if (!showHistory) loadBetHistory(); }}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition">
          <History className="w-4 h-4" /> History
        </motion.button>
      </div>

      {/* Game Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-2xl shadow-sm border overflow-hidden mx-2 mb-2"
      >
        {/* Game Title */}
        <div className="px-4 pt-3 pb-1 text-center">
          <h1 className="text-base font-bold text-foreground">{game.gameName}</h1>
          <div className="flex items-center justify-center gap-2 mt-0.5 text-[10px] text-muted-foreground/60">
            <span className="flex items-center gap-0.5"><Shield className="w-3 h-3" /> Fair</span>
            <span>RTP {Number(game.rtp)}%</span>
          </div>
        </div>

        {/* Game Component */}
        <div className="px-3 pb-4 pt-1">
          {gameType === 'COIN_FLIP' && <CoinFlipGame result={result} selectedBet={selectedBet} onSelectBet={setSelectedBet} isPlaying={playing} />}
          {gameType === 'DICE_ROLL' && <DiceGame result={result} selectedBet={selectedBet} onSelectBet={setSelectedBet} isPlaying={playing} />}
          {gameType === 'HI_LO' && <HiLoGame result={result} selectedBet={selectedBet} onSelectBet={setSelectedBet} isPlaying={playing} />}
          {(gameType === 'TEEN_PATTI' || gameType === 'INDIAN_POKER') && <CardGame result={result} selectedBet={selectedBet} onSelectBet={setSelectedBet} isPlaying={playing} gameType={gameType as 'TEEN_PATTI' | 'INDIAN_POKER'} />}
          {gameType === 'ANDAR_BAHAR' && <AndarBaharGame result={result} selectedBet={selectedBet} onSelectBet={setSelectedBet} isPlaying={playing} />}
        </div>
      </motion.div>

      {/* Betting Controls - Compact */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card rounded-2xl shadow-sm border p-3 mx-2 mb-2"
      >
        {/* Balance + Potential Win Row */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Wallet className="w-3 h-3" /> Balance
          </span>
          <motion.span key={user?.balance} initial={{ y: 5, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            className="text-xs font-bold text-green-600">
            {formatCurrency(user?.balance || 0)}
          </motion.span>
        </div>

        {/* Chips Row */}
        <div className="flex justify-center gap-2 mb-3">
          {CHIP_AMOUNTS.filter(a => a <= Number(game.maxBet)).map(a => (
            <Chip key={a} amount={a} selected={amount === a} onClick={() => setAmount(a)} disabled={playing} />
          ))}
        </div>

        {/* Amount input with half/double */}
        <div className="flex items-center gap-2 mb-3">
          <motion.button whileTap={{ scale: 0.9 }}
            onClick={() => setAmount(Math.max(Number(game.minBet), Math.floor(amount / 2)))}
            disabled={playing}
            className="px-2.5 py-1.5 bg-muted rounded-lg text-[10px] font-bold hover:bg-muted/70 transition">
            {'\u00BD'}
          </motion.button>
          <input
            type="number" value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            min={Number(game.minBet)} max={Number(game.maxBet)} disabled={playing}
            className="flex-1 px-3 py-2 border rounded-xl text-center text-sm font-bold bg-background focus:ring-2 focus:ring-brand-teal/50 outline-none"
          />
          <motion.button whileTap={{ scale: 0.9 }}
            onClick={() => setAmount(Math.min(Number(game.maxBet), amount * 2))}
            disabled={playing}
            className="px-2.5 py-1.5 bg-muted rounded-lg text-[10px] font-bold hover:bg-muted/70 transition">
            2{'\u00D7'}
          </motion.button>
        </div>

        {/* Potential Win */}
        <AnimatePresence>
          {selectedBet && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex justify-between text-xs mb-2 p-2 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200/50 dark:border-green-800/30">
                <span className="text-green-700 dark:text-green-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Win
                </span>
                <span className="font-bold text-green-700 dark:text-green-400">
                  {formatCurrency(Math.round(amount * odds * 100) / 100)}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Result Message */}
        <AnimatePresence>
          {message.text && (
            <motion.div
              initial={{ opacity: 0, y: -5, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn(
                'mb-2 p-2.5 rounded-xl text-sm text-center font-bold',
                message.type === 'success'
                  ? 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400'
              )}
            >
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Play Button */}
        <motion.button
          whileHover={!playing && selectedBet ? { scale: 1.02 } : {}}
          whileTap={!playing && selectedBet ? { scale: 0.97 } : {}}
          onClick={handlePlay}
          disabled={playing || !selectedBet}
          className={cn(
            'relative w-full py-3 rounded-xl text-white font-bold text-sm transition-all overflow-hidden',
            playing ? 'bg-gray-400 cursor-not-allowed' :
            !selectedBet ? 'bg-muted text-muted-foreground cursor-not-allowed' :
            'bg-gradient-to-r from-brand-teal-dark to-brand-teal shadow-lg shadow-brand-teal/25'
          )}
        >
          {selectedBet && !playing && <div className="absolute inset-0 shimmer-effect opacity-30" />}
          <span className="relative z-10">
            {playing ? 'Playing...' : !selectedBet ? 'Select a bet' : `Play \u20B9${amount.toLocaleString()}`}
          </span>
        </motion.button>
      </motion.div>

      {/* Recent Results - Clickable with game outcome */}
      <AnimatePresence>
        {lastResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl shadow-sm border p-3 mx-2 mb-2"
          >
            <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Recent</h3>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {lastResults.map((r, i) => {
                const profitDisplay = r.isWinner
                  ? `+${formatCurrency(r.profit)}`
                  : `-${formatCurrency(Math.abs(r.profit || r.amount))}`;

                return (
                  <motion.button
                    key={i}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => setExpandedResult(expandedResult === i ? null : i)}
                    className={cn(
                      'flex-shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center border transition-all cursor-pointer',
                      r.isWinner
                        ? 'bg-green-50 border-green-300 dark:bg-green-950/30 dark:border-green-700 hover:border-green-400'
                        : 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800 hover:border-red-300',
                      expandedResult === i && 'ring-2 ring-brand-teal'
                    )}
                  >
                    <span className={cn('text-xs font-black', r.isWinner ? 'text-green-600' : 'text-red-500')}>
                      {r.isWinner ? 'W' : 'L'}
                    </span>
                    <span className={cn('text-[9px] font-bold leading-tight', r.isWinner ? 'text-green-600' : 'text-red-500')}>
                      {profitDisplay}
                    </span>
                  </motion.button>
                );
              })}
            </div>

            {/* Expanded Result Detail */}
            <AnimatePresence>
              {expandedResult !== null && lastResults[expandedResult] && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 p-2.5 bg-muted/50 rounded-lg border text-xs">
                    <div className="flex justify-between mb-1">
                      <span className="text-muted-foreground">Bet</span>
                      <span className="font-medium">{lastResults[expandedResult].betType}</span>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span className="text-muted-foreground">Stake</span>
                      <span className="font-medium">{formatCurrency(lastResults[expandedResult].amount)}</span>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span className="text-muted-foreground">Outcome</span>
                      <span className="font-medium">{getOutcomeLabel(lastResults[expandedResult], gameType)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">P&L</span>
                      <span className={cn('font-bold', lastResults[expandedResult].isWinner ? 'text-green-600' : 'text-red-500')}>
                        {lastResults[expandedResult].isWinner ? '+' : ''}{formatCurrency(lastResults[expandedResult].profit)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History Panel */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-card rounded-2xl shadow-sm border p-3 mx-2 mb-2 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-foreground">Bet History</h3>
              <button onClick={() => setShowHistory(false)}>
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            {betHistory.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No history yet</p>
            ) : (
              <div className="space-y-1.5 max-h-60 overflow-y-auto scrollbar-hide">
                {betHistory.map((bet: any, i: number) => (
                  <motion.div key={bet.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <p className="text-xs font-medium text-foreground">{bet.betType}</p>
                      <p className="text-[10px] text-muted-foreground">{formatCurrency(Number(bet.amount))}</p>
                    </div>
                    <span className={cn('text-xs font-bold',
                      bet.status === 'WON' ? 'text-green-600' : 'text-red-500'
                    )}>
                      {bet.status === 'WON'
                        ? `+${formatCurrency(Math.round((Number(bet.actualWin) - Number(bet.amount)) * 100) / 100)}`
                        : `-${formatCurrency(Number(bet.amount))}`
                      }
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Provably Fair - Compact */}
      <div className="bg-card rounded-2xl shadow-sm border p-2.5 mx-2">
        <h3 className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
          <Shield className="w-3 h-3" /> Provably Fair
        </h3>
        <p className="text-[10px] text-muted-foreground/60 leading-relaxed mt-0.5">
          Every round uses HMAC-SHA256 with a pre-committed server seed. After play, the seed is revealed for verification.
        </p>
      </div>
    </div>
  );
}
