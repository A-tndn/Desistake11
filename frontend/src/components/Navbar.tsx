'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { formatCurrency } from '@/lib/utils';

export default function Navbar() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const isAgent = user?.type === 'agent';
  const isMaster = user?.role === 'MASTER' || user?.role === 'SUPER_MASTER';

  const navigate = (path: string) => {
    router.push(path);
    setMobileMenuOpen(false);
  };

  return (
    <nav className="bg-white border-b border-gray-200 px-3 sm:px-4 py-3 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Mobile menu button */}
          <button
            className="md:hidden p-1 text-gray-600"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          <h1
            className="text-lg sm:text-xl font-bold text-blue-600 cursor-pointer"
            onClick={() => navigate(isAgent ? '/agent/dashboard' : '/dashboard')}
          >
            CricBet
          </h1>

          <div className="hidden md:flex items-center gap-4">
            {isAgent ? (
              <>
                <button onClick={() => navigate('/agent/dashboard')} className="text-sm text-gray-600 hover:text-blue-600 transition">
                  Dashboard
                </button>
                <button onClick={() => navigate('/agent/players')} className="text-sm text-gray-600 hover:text-blue-600 transition">
                  Players
                </button>
                <button onClick={() => navigate('/agent/credits')} className="text-sm text-gray-600 hover:text-blue-600 transition">
                  Credits
                </button>
                <button onClick={() => navigate('/agent/bet-history')} className="text-sm text-gray-600 hover:text-blue-600 transition">
                  Bet History
                </button>
                <button onClick={() => navigate('/agent/commissions')} className="text-sm text-gray-600 hover:text-blue-600 transition">
                  Commissions
                </button>
                {isMaster && (
                  <button onClick={() => navigate('/agent/player-settings')} className="text-sm text-amber-600 hover:text-amber-700 transition font-medium">
                    Settings
                  </button>
                )}
              </>
            ) : (
              <>
                <button onClick={() => navigate('/dashboard')} className="text-sm text-gray-600 hover:text-blue-600 transition">
                  Dashboard
                </button>
                <button onClick={() => navigate('/matches')} className="text-sm text-gray-600 hover:text-blue-600 transition">
                  Matches
                </button>
                <button onClick={() => navigate('/bets')} className="text-sm text-gray-600 hover:text-blue-600 transition">
                  My Bets
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {user?.balance !== undefined && !isAgent && (
            <div className="flex items-center gap-1.5">
              <div className="bg-green-50 text-green-700 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-sm font-medium">
                <span className="hidden sm:inline">Coins: </span>{formatCurrency(user.balance)}
              </div>
              {user?.exposure !== undefined && user.exposure > 0 && (
                <div className="bg-red-50 text-red-600 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-sm font-medium">
                  <span className="hidden sm:inline">Used: </span>{formatCurrency(user.exposure)}
                </div>
              )}
            </div>
          )}
          {user?.balance !== undefined && isAgent && (
            <div className="bg-green-50 text-green-700 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium">
              {formatCurrency(user.balance)}
            </div>
          )}

          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900">{user?.displayName || user?.username}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role?.toLowerCase().replace('_', ' ')}</p>
            </div>

            <button
              onClick={handleLogout}
              className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-3 pt-3 border-t space-y-1">
          {isAgent ? (
            <>
              <button onClick={() => navigate('/agent/dashboard')} className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
                Dashboard
              </button>
              <button onClick={() => navigate('/agent/players')} className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
                Players
              </button>
              <button onClick={() => navigate('/agent/credits')} className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
                Credits
              </button>
              <button onClick={() => navigate('/matches')} className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
                Matches
              </button>
              <button onClick={() => navigate('/agent/account-statement')} className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
                Account Statement
              </button>
              <button onClick={() => navigate('/agent/bet-history')} className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
                Bet History
              </button>
              <button onClick={() => navigate('/agent/client-ledger')} className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
                Client Ledger
              </button>
              <button onClick={() => navigate('/agent/commissions')} className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
                Commissions
              </button>
              {isMaster && (
                <button onClick={() => navigate('/agent/player-settings')} className="block w-full text-left px-3 py-2 text-sm text-amber-600 font-medium hover:bg-amber-50 rounded-lg">
                  Player Settings
                </button>
              )}
            </>
          ) : (
            <>
              <button onClick={() => navigate('/dashboard')} className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
                Dashboard
              </button>
              <button onClick={() => navigate('/inplay')} className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
                In-Play
              </button>
              <button onClick={() => navigate('/matches')} className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
                Matches
              </button>
              <button onClick={() => navigate('/bets')} className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
                My Bets
              </button>
              <button onClick={() => navigate('/account-statement')} className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
                Account Statement
              </button>
              <button onClick={() => navigate('/ledger')} className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
                Ledger
              </button>
              <button onClick={() => navigate('/complete-games')} className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
                Completed Games
              </button>
              <button onClick={() => navigate('/profile')} className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
                Profile
              </button>
              <button onClick={() => navigate('/rules')} className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
                Rules
              </button>
            </>
          )}
          <div className="sm:hidden pt-2 px-3">
            <p className="text-xs text-gray-500">{user?.displayName || user?.username}</p>
            <p className="text-xs text-gray-400 capitalize">{user?.role?.toLowerCase().replace('_', ' ')}</p>
          </div>
        </div>
      )}
    </nav>
  );
}
