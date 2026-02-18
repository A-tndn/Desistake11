'use client';

import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  FileText, Activity, Home, CheckCircle, ScrollText,
} from 'lucide-react';

const navItems = [
  { href: '/account', label: 'Statement', icon: FileText },
  { href: '/inplay', label: 'Inplay', icon: Activity },
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/completed-games', label: 'Completed', icon: CheckCircle },
  { href: '/bets', label: 'My Bets', icon: ScrollText },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 pb-safe md:hidden">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href.split('?')[0]);
          const Icon = item.icon;
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={cn(
                'flex flex-col items-center gap-0.5 py-2 px-3 min-w-0 flex-1 transition',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
