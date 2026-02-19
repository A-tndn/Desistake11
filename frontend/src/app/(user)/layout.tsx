'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useSocket } from '@/hooks/useSocket';
import UserNavbar from '@/components/layout/UserNavbar';
import BottomNav from '@/components/layout/BottomNav';
import Sidebar from '@/components/layout/Sidebar';
import WelcomeBanner from '@/components/layout/WelcomeBanner';
import ToastContainer from '@/components/notifications/ToastContainer';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
import InactivityTimeout from '@/components/InactivityTimeout';
import PageTransition from '@/components/PageTransition';

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Connect to Socket.io
  useSocket();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push('/login');
    }
  }, [mounted, isAuthenticated, router]);

  if (!mounted || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-brand-teal text-lg font-medium">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <UserNavbar onMenuToggle={() => setSidebarOpen(true)} />
      <WelcomeBanner />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="pb-16 md:pb-0">
        <PageTransition>
          {children}
        </PageTransition>
      </main>

      <BottomNav />
      <ToastContainer />
      <PWAInstallPrompt />
      <InactivityTimeout />
    </div>
  );
}
