'use client';

import { useState, useEffect, useRef } from 'react';
import { useBetStore } from '@/store/betStore';
import { useAuthStore } from '@/store/authStore';
import { betService } from '@/services/bet.service';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { X, RotateCcw } from 'lucide-react';

const CHIP_AMOUNTS = [
  { label: '100', value: 100 },
  { label: '500', value: 500 },
  { label: '1K', value: 1000 },
  { label: '2K', value: 2000 },
  { label: '5K', value: 5000 },
  { label: '10K', value: 10000 },
  { label: '25K', value: 25000 },
  { label: '50K', value: 50000 },
  { label: '1L', value: 100000 },
];

export default function BetSlip() {
  const { betSlip, isOpen, isSubmitting, updateAmount, clearBetSlip, setSubmitting } = useBetStore();
  const { user } = useAuthStore();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastChipClicked, setLastChipClicked] = useState<number | null>(null);
  const prevBetSlipRef = useRef<string | null>(null);

  // Reset local state when betSlip changes (new market selected)
  const betSlipKey = betSlip ? `${betSlip.matchId}_${betSlip.betOn}_${betSlip.fancyMarketId || 'bm'}` : null;
  useEffect(() => {
    if (betSlipKey && betSlipKey !== prevBetSlipRef.current) {
      setError('');
      setSuccess('');
      setLastChipClicked(null);
      prevBetSlipRef.current = betSlipKey;
    }
  }, [betSlipKey]);

  if (!betSlip || !isOpen) return null;

  const isFancy = !!betSlip.fancyMarketId;
  const potentialWin = betSlip.amount * betSlip.odds;
  const potentialProfit = potentialWin - betSlip.amount;

  // Chip click handler - CUMULATIVE: each click adds the chip value
  const handleChipClick = (chipValue: number) => {
    const newAmount = betSlip.amount + chipValue;
    updateAmount(newAmount);
    setLastChipClicked(chipValue);
  };

  // Reset amount to 0
  const handleReset = () => {
    updateAmount(0);
    setLastChipClicked(null);
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    if (betSlip.amount <= 0) {
      setError('Tap chips to set stake amount');
      return;
    }
    if (user?.balance !== undefined && betSlip.amount > user.balance) {
      setError('Insufficient balance');
      return;
    }

    setSubmitting(true);
    try {
      if (isFancy && betSlip.fancyMarketId) {
        await betService.placeFancyBet(betSlip.fancyMarketId, {
          matchId: betSlip.matchId,
          betOn: betSlip.betOn,
          amount: betSlip.amount,
          odds: betSlip.odds,
        });
      } else {
        await betService.placeBet({
          matchId: betSlip.matchId,
          betType: betSlip.betType,
          betOn: betSlip.betOn,
          amount: betSlip.amount,
          odds: betSlip.odds,
        });
      }
      setSuccess('Bet placed!');
      // Update balance in auth store
      if (user?.balance !== undefined) {
        // Balance will be updated via WebSocket, no need to manually update
      }
      setTimeout(() => {
        clearBetSlip();
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to place bet');
    } finally {
      setSubmitting(false);
    }
  };

  const typeLabel = isFancy
    ? (betSlip.isBack ? 'YES' : 'NO')
    : (betSlip.isBack ? 'LAGAI' : 'KHAI');

  const displayName = isFancy
    ? betSlip.fancyMarketName || betSlip.betOn
    : betSlip.betOn;

  const isBack = betSlip.isBack;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 md:top-16 md:right-4 md:left-auto md:w-[420px]">
      <div className="animate-slide-down bg-card border-b md:border md:rounded-xl shadow-2xl">
        {/* Header bar */}
        <div className={cn(
          'flex items-center justify-between px-3 py-2',
          isBack ? 'bg-back' : 'bg-lay'
        )}>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={cn(
                'text-[10px] font-bold px-2 py-0.5 rounded',
                isBack ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'
              )}>
                {typeLabel}
              </span>
              <span className="text-xs font-semibold text-foreground truncate">
                {displayName}
              </span>
            </div>
            {isFancy && betSlip.runValue != null && (
              <p className="text-[11px] font-semibold text-foreground mt-0.5">
                @ {betSlip.runValue} runs &middot; Rate: {Number(betSlip.odds).toFixed(2)}
              </p>
            )}
            {!isFancy && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Odds: {Number(betSlip.odds).toFixed(2)}
              </p>
            )}
          </div>
          <button onClick={clearBetSlip} className="p-1.5 hover:bg-black/10 rounded-full transition ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-3 py-2 space-y-2">
          {/* Amount display + reset */}
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                type="number"
                value={betSlip.amount || ''}
                onChange={(e) => {
                  updateAmount(parseFloat(e.target.value) || 0);
                  setLastChipClicked(null);
                }}
                placeholder="Tap chips below"
                className="w-full text-center text-lg font-bold border-2 rounded-lg py-2 px-3 focus:ring-2 focus:ring-brand-teal focus:border-brand-teal outline-none"
              />
              {betSlip.amount > 0 && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                  {formatCurrency(betSlip.amount)}
                </span>
              )}
            </div>
            <button
              onClick={handleReset}
              className="p-2.5 bg-muted hover:bg-red-100 rounded-lg transition"
              title="Reset to 0"
            >
              <RotateCcw className="w-4 h-4 text-red-500" />
            </button>
          </div>

          {/* Chip buttons - casino chip style */}
          <div className="flex flex-wrap gap-1.5">
            {CHIP_AMOUNTS.map((chip) => (
              <button
                key={chip.value}
                onClick={() => handleChipClick(chip.value)}
                className={cn(
                  'relative px-3 py-2 rounded-full text-xs font-bold border-2 transition-all',
                  'active:scale-90 hover:scale-105 hover:shadow-md',
                  'min-w-[52px] text-center',
                  lastChipClicked === chip.value
                    ? 'bg-brand-teal text-white border-brand-teal-dark shadow-lg scale-105'
                    : 'bg-gradient-to-b from-white to-gray-100 text-gray-800 border-gray-300 hover:border-brand-teal',
                )}
              >
                <span className="relative z-10">{chip.label}</span>
                {/* Chip decoration ring */}
                <span className={cn(
                  'absolute inset-[3px] rounded-full border border-dashed',
                  lastChipClicked === chip.value ? 'border-white/40' : 'border-gray-300/60'
                )} />
              </button>
            ))}
          </div>

          {/* Returns row - compact */}
          <div className="flex items-center justify-between bg-muted/60 rounded-lg px-3 py-1.5 text-xs">
            <span className="text-muted-foreground">
              Profit: <span className="font-semibold text-brand-green">+{formatCurrency(potentialProfit > 0 ? potentialProfit : 0)}</span>
            </span>
            <span className="text-muted-foreground">
              Returns: <span className="font-semibold text-foreground">{formatCurrency(potentialWin)}</span>
            </span>
          </div>

          {/* Error/Success */}
          {error && <p className="text-xs text-red-600 text-center">{error}</p>}
          {success && <p className="text-xs text-green-600 text-center font-semibold">{success}</p>}

          {/* Place bet button */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || betSlip.amount <= 0}
            className={cn(
              'w-full py-2.5 rounded-lg text-sm font-bold text-white transition',
              isBack
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-red-500 hover:bg-red-600',
              (isSubmitting || betSlip.amount <= 0) && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isSubmitting ? 'Placing...' : `Place ${typeLabel} Bet — ${formatCurrency(betSlip.amount)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
