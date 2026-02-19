'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';
import { useMatchStore } from '@/store/matchStore';
import { useNotificationStore } from '@/store/notificationStore';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:5000';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const { user, isAuthenticated, updateBalance } = useAuthStore();
  const { updateMatchOdds, updateMatchStatus } = useMatchStore();
  const { addNotification, addToast } = useNotificationStore();

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      // Join user-specific room
      socket.emit('join-user', user.id);
    });

    // ============================================
    // BALANCE UPDATES
    // ============================================
    socket.on('balance:updated', (data: { balance: string; reason: string }) => {
      updateBalance(parseFloat(data.balance));
    });

    // ============================================
    // BET SETTLED
    // ============================================
    socket.on('bet:settled', (data: { betId: string; status: string; actualWin: string; matchName: string }) => {
      const won = data.status === 'WON';
      addNotification({
        type: won ? 'success' : 'info',
        title: won ? 'Bet Won!' : 'Bet Settled',
        message: won
          ? `You won ${data.actualWin} on ${data.matchName}`
          : `Your bet on ${data.matchName} was settled as ${data.status}`,
        category: 'BETTING',
        priority: won ? 'HIGH' : 'NORMAL',
        actionUrl: '/bets',
      });
      addToast({
        type: won ? 'success' : 'info',
        title: won ? 'Bet Won!' : 'Bet Settled',
        message: won
          ? `You won ${data.actualWin} on ${data.matchName}`
          : `Your bet on ${data.matchName} was settled as ${data.status}`,
        actionUrl: '/bets',
        duration: 6000,
      });
    });

    // ============================================
    // ODDS UPDATES
    // ============================================
    socket.on('odds:updated', (data: any) => {
      updateMatchOdds(data.matchId, data);
    });

    // ============================================
    // FANCY MARKET EVENTS (dispatched as custom events for page-level listeners)
    // ============================================
    socket.on('fancy:updated', (data: any) => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fancy:updated', { detail: data }));
      }
    });

    socket.on('fancy:new', (data: any) => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fancy:new', { detail: data }));
      }
    });

    socket.on('fancy:suspended', (data: any) => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fancy:suspended', { detail: data }));
      }
    });

    socket.on('fancy:all-suspended', (data: any) => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fancy:all-suspended', { detail: data }));
      }
    });

    socket.on('bookmaker:suspended', (data: any) => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('bookmaker:suspended', { detail: data }));
      }
    });

    socket.on('fancy:settled', (data: any) => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fancy:settled', { detail: data }));
      }
    });

    socket.on('fancy:bulk-update', (data: any) => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fancy:bulk-update', { detail: data }));
      }
    });

    // ============================================
    // BOOKMAKER UPDATES
    // ============================================
    socket.on('bookmaker:updated', (data: any) => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('bookmaker:updated', { detail: data }));
      }
    });

    // ============================================
    // BET VOID ALERTS (only fires when actual bets get voided due to wrong odds)
    // ============================================
    socket.on('bet:voided', (data: { betId: string; matchName: string; reason: string; refundAmount: string }) => {
      addNotification({
        type: 'warning',
        title: 'Bet Voided',
        message: `Your bet on ${data.matchName} was voided. Refund: ${data.refundAmount}. Reason: ${data.reason}`,
        category: 'BETTING',
        priority: 'HIGH',
        actionUrl: '/bets',
      });
      addToast({
        type: 'warning',
        title: 'Bet Voided',
        message: `Bet voided on ${data.matchName}. Refund: ${data.refundAmount}`,
        duration: 8000,
        actionUrl: '/bets',
      });
    });

    // ============================================
    // LIVE SCORE UPDATES
    // ============================================
    socket.on('score:updated', (data: any) => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('score:updated', { detail: data }));
      }
    });

    // ============================================
    // MATCH STATUS CHANGES
    // ============================================
    socket.on('match:status', (data: { matchId: string; status: string }) => {
      updateMatchStatus(data.matchId, data.status);
      if (data.status === 'LIVE') {
        addNotification({
          type: 'info',
          title: 'Match Started',
          message: 'A match is now LIVE!',
          category: 'BETTING',
          priority: 'HIGH',
        });
        addToast({
          type: 'info',
          title: 'Match Going Live!',
          message: 'A match is now LIVE! Place your bets!',
          duration: 8000,
        });
      }
    });

    // ============================================
    // DEPOSIT/WITHDRAWAL STATUS
    // ============================================
    socket.on('deposit:status', (data: { status: string; amount: string }) => {
      const approved = data.status === 'APPROVED';
      addNotification({
        type: approved ? 'success' : 'warning',
        title: `Deposit ${data.status}`,
        message: `Your deposit of ${data.amount} has been ${data.status.toLowerCase()}`,
        category: 'FINANCE',
        priority: 'HIGH',
        actionUrl: '/deposit',
      });
      addToast({
        type: approved ? 'success' : 'warning',
        title: `Deposit ${data.status}`,
        message: `Your deposit of ${data.amount} has been ${data.status.toLowerCase()}`,
        actionUrl: '/deposit',
      });
    });

    socket.on('withdrawal:status', (data: { status: string; amount: string }) => {
      const approved = data.status === 'APPROVED';
      addNotification({
        type: approved ? 'success' : 'warning',
        title: `Withdrawal ${data.status}`,
        message: `Your withdrawal of ${data.amount} has been ${data.status.toLowerCase()}`,
        category: 'FINANCE',
        priority: 'HIGH',
        actionUrl: '/withdraw',
      });
      addToast({
        type: approved ? 'success' : 'warning',
        title: `Withdrawal ${data.status}`,
        message: `Your withdrawal of ${data.amount} has been ${data.status.toLowerCase()}`,
        actionUrl: '/withdraw',
      });
    });

    // ============================================
    // SERVER-SIDE PERSISTENT NOTIFICATION
    // ============================================
    socket.on('notification:new', (data: {
      id: string;
      title: string;
      message: string;
      type: string;
      category?: string;
      priority?: string;
      actionUrl?: string;
      createdAt: string;
    }) => {
      const notifType = data.priority === 'HIGH' || data.priority === 'URGENT' ? 'warning' as const :
            data.type?.includes('REJECTED') ? 'error' as const :
            data.type?.includes('APPROVED') || data.type?.includes('WON') ? 'success' as const : 'info' as const;

      addNotification({
        type: notifType,
        title: data.title,
        message: data.message,
        category: data.category,
        priority: data.priority,
        actionUrl: data.actionUrl,
        persistent: true,
      });

      // Show a toast for high priority notifications
      if (data.priority === 'HIGH' || data.priority === 'URGENT') {
        addToast({
          type: notifType,
          title: data.title,
          message: data.message,
          actionUrl: data.actionUrl,
          duration: data.priority === 'URGENT' ? 10000 : 6000,
        });
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, user?.id]);

  const joinMatch = (matchId: string) => {
    socketRef.current?.emit('join-match', matchId);
  };

  const leaveMatch = (matchId: string) => {
    socketRef.current?.emit('leave-match', matchId);
  };

  return { socket: socketRef.current, joinMatch, leaveMatch };
}
