'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Clock } from 'lucide-react';

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const WARNING_BEFORE = 60 * 1000; // Show warning 1 minute before logout

export default function InactivityTimeout() {
  const router = useRouter();
  const { isAuthenticated, logout } = useAuthStore();
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const clearAllTimers = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  const handleLogout = useCallback(() => {
    clearAllTimers();
    setShowWarning(false);
    logout();
    router.push('/login');
  }, [clearAllTimers, logout, router]);

  const resetTimer = useCallback(() => {
    if (!isAuthenticated) return;

    clearAllTimers();
    setShowWarning(false);
    setSecondsLeft(60);

    warningRef.current = setTimeout(() => {
      setShowWarning(true);
      setSecondsLeft(60);

      countdownRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            handleLogout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, INACTIVITY_TIMEOUT - WARNING_BEFORE);

    timeoutRef.current = setTimeout(handleLogout, INACTIVITY_TIMEOUT);
  }, [isAuthenticated, clearAllTimers, handleLogout]);

  useEffect(() => {
    if (!isAuthenticated) {
      clearAllTimers();
      setShowWarning(false);
      return;
    }

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    const handleActivity = () => { if (!showWarning) resetTimer(); };

    events.forEach((event) => document.addEventListener(event, handleActivity));
    resetTimer();

    return () => {
      events.forEach((event) => document.removeEventListener(event, handleActivity));
      clearAllTimers();
    };
  }, [isAuthenticated, showWarning, resetTimer, clearAllTimers]);

  if (!isAuthenticated || !showWarning) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center px-4">
      <div className="bg-card rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-yellow-500 px-6 py-4 text-center">
          <Clock className="w-12 h-12 text-white mx-auto mb-2" />
          <h3 className="text-white text-lg font-bold">Session Timeout</h3>
        </div>

        <div className="p-6 text-center">
          <p className="text-muted-foreground text-sm mb-4">
            You have been inactive. Your session will expire in:
          </p>

          <div className="text-4xl font-bold text-red-600 mb-6">
            {secondsLeft}s
          </div>

          <div className="w-full bg-muted rounded-full h-2 mb-6">
            <div
              className="bg-yellow-500 h-2 rounded-full transition-all duration-1000"
              style={{ width: `${(secondsLeft / 60) * 100}%` }}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleLogout}
              className="flex-1 py-3 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted transition"
            >
              Logout
            </button>
            <button
              onClick={() => resetTimer()}
              className="flex-1 py-3 bg-brand-teal text-white rounded-xl text-sm font-bold hover:opacity-90 transition"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
