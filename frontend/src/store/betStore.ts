'use client';

import { create } from 'zustand';

export interface BetSlipItem {
  matchId: string;
  matchName: string;
  betType: string;
  betOn: string;
  odds: number;
  isBack: boolean;
  amount: number;
  // Fancy-specific fields
  fancyMarketId?: string;
  fancyMarketName?: string;
  runValue?: number;
}

interface BetStore {
  betSlip: BetSlipItem | null;
  isOpen: boolean;
  isSubmitting: boolean;

  addToBetSlip: (item: Omit<BetSlipItem, 'amount'>) => void;
  updateAmount: (amount: number) => void;
  clearBetSlip: () => void;
  openBetSlip: () => void;
  closeBetSlip: () => void;
  setSubmitting: (val: boolean) => void;
}

export const useBetStore = create<BetStore>((set) => ({
  betSlip: null,
  isOpen: false,
  isSubmitting: false,

  addToBetSlip: (item) =>
    set({
      betSlip: { ...item, amount: 0 },
      isOpen: true,
    }),

  updateAmount: (amount) =>
    set((state) => ({
      betSlip: state.betSlip ? { ...state.betSlip, amount } : null,
    })),

  clearBetSlip: () => set({ betSlip: null, isOpen: false, isSubmitting: false }),

  openBetSlip: () => set({ isOpen: true }),
  closeBetSlip: () => set({ isOpen: false }),
  setSubmitting: (val) => set({ isSubmitting: val }),
}));
