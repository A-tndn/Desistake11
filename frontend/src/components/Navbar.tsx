'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { formatCurrency } from '@/lib/utils';

export default function Navbar() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const isAgent = user?.type === 'agent';

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1
            className="text-xl font-bold text-blue-600 cursor-pointer"
            onClick={() => router.push(isAgent ? '/agent/dashboard' : '/dashboard')}
          >
            CricBet
          </h1>

          <div className="hidden md:flex items-center gap-4">
            {isAgent ? (
              <>
                <button
                  onClick={() => router.push('/agent/dashboard')}
                  className="text-sm text-gray-600 hover:text-blue-600 transition"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => router.push('/agent/players')}
                  className="text-sm text-gray-600 hover:text-blue-600 transition"
                >
                  Players
                </button>
                <button
                  onClick={() => router.push('/agent/credits')}
                  className="text-sm text-gray-600 hover:text-blue-600 transition"
                >
                  Credits
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="text-sm text-gray-600 hover:text-blue-600 transition"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => router.push('/matches')}
                  className="text-sm text-gray-600 hover:text-blue-600 transition"
                >
                  Matches
                </button>
                <button
                  onClick={() => router.push('/bets')}
                  className="text-sm text-gray-600 hover:text-blue-600 transition"
                >
                  My Bets
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {user?.balance !== undefined && (
            <div className="bg-green-50 text-green-700 px-3 py-1.5 rounded-lg text-sm font-medium">
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
              className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
