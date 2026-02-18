'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Users, Trophy, Activity, ArrowDownCircle,
  ArrowUpCircle, FileText, BookOpen, LogOut, ChevronRight,
  X, Wallet, Gamepad2, History, TrendingUp, ImagePlus,
  Dices, BarChart3, CreditCard, Scale, ClipboardList,
  Target, KeyRound, Receipt, Handshake, User,
} from 'lucide-react';

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const menuSections = [
  {
    title: 'Overview',
    items: [
      { href: '/agent/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Management',
    items: [
      { href: '/agent/clients', label: 'Client Master', icon: Users },
      { href: '/agent/matches/current', label: 'Current Matches', icon: Activity },
      { href: '/agent/matches/completed', label: 'Completed Matches', icon: Trophy },
      { href: '/agent/casino', label: 'Casino Games', icon: Gamepad2 },
      { href: '/agent/banners', label: 'Banner Mgmt', icon: ImagePlus },
    ],
  },
  {
    title: 'Casino',
    items: [
      { href: '/agent/casino/details', label: 'Casino Details & Bets', icon: Dices },
    ],
  },
  {
    title: 'Transactions',
    items: [
      { href: '/agent/credits', label: 'Credit Mgmt', icon: Wallet },
      { href: '/agent/cash-transaction', label: 'Cash Transaction', icon: CreditCard },
      { href: '/agent/transactions/deposits', label: 'Deposits', icon: ArrowDownCircle },
      { href: '/agent/transactions/withdrawals', label: 'Withdrawals', icon: ArrowUpCircle },
    ],
  },
  {
    title: 'Reports',
    items: [
      { href: '/agent/reports', label: 'Overview', icon: FileText },
      { href: '/agent/account-statement', label: 'Account Statement', icon: FileText },
      { href: '/agent/reports/details', label: 'Report Details', icon: ClipboardList },
      { href: '/agent/bet-history', label: 'Bet History', icon: History },
      { href: '/agent/reports/current-bets', label: 'Current Bets', icon: Target },
      { href: '/agent/client-ledger', label: 'Client Ledger', icon: BookOpen },
      { href: '/agent/commissions', label: 'Commissions', icon: TrendingUp },
      { href: '/agent/lena-dena', label: 'Lena Dena', icon: Handshake },
      { href: '/agent/my-ledger', label: 'My Ledger', icon: Receipt },
      { href: '/agent/reports/sports', label: 'Sports Reports', icon: BarChart3 },
    ],
  },
  {
    title: 'Settings',
    items: [
      { href: '/agent/profile', label: 'My Profile', icon: User },
      { href: '/agent/change-password', label: 'Change Password', icon: KeyRound },
    ],
  },
];

export default function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const handleNav = (href: string) => {
    router.push(href);
    onClose();
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 lg:hidden" onClick={onClose} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full bg-gray-900 text-white z-50 transition-transform duration-300 flex flex-col',
          'w-64',
          'lg:translate-x-0 lg:static lg:z-auto',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold">
              <span className="text-brand-orange">Stake</span>111
              <span className="text-xs text-muted-foreground ml-1.5">Admin</span>
            </h1>
            <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded lg:hidden">
              <X className="w-5 h-5" />
            </button>
          </div>
          {user && (
            <div className="mt-3 bg-gray-800 rounded-lg p-2.5">
              <p className="text-sm font-medium truncate">{user.displayName || user.username}</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-muted-foreground capitalize">{user.role?.toLowerCase().replace('_', ' ')}</span>
                {user.balance !== undefined && (
                  <span className="text-xs text-brand-orange font-semibold flex items-center gap-1">
                    <Wallet className="w-3 h-3" />
                    {formatCurrency(user.balance)}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Menu */}
        <nav className="flex-1 overflow-y-auto py-2">
          {menuSections.map((section) => (
            <div key={section.title} className="mb-1">
              <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </p>
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                const Icon = item.icon;
                return (
                  <button
                    key={item.href}
                    onClick={() => handleNav(item.href)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2 text-sm transition',
                      isActive
                        ? 'bg-brand-teal/20 text-brand-orange border-r-2 border-brand-orange'
                        : 'text-muted-foreground hover:bg-gray-800 hover:text-white'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="flex-1 text-left">{item.label}</span>
                    {isActive && <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground hover:text-red-400 hover:bg-gray-800 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
