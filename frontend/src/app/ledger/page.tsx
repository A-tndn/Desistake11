'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { userService } from '@/services/user.service';
import { formatCurrency, formatDate } from '@/lib/utils';
import Navbar from '@/components/Navbar';

export default function LedgerPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [ledger, setLedger] = useState<any[]>([]);
  const [totalProfit, setTotalProfit] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    loadLedger();
  }, [isAuthenticated]);

  const loadLedger = async () => {
    try {
      const res = await userService.getLedger();
      const data = (res as any).data;
      setLedger(data?.ledger || []);
      setTotalProfit(data?.totalProfit || 0);
    } catch (error) {
      console.error('Failed to load ledger:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">My Ledger</h2>

        {/* Total Summary */}
        <div className={`rounded-xl p-4 sm:p-5 mb-4 border ${totalProfit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <p className="text-sm text-gray-600">Total P&L</p>
          <p className={`text-2xl sm:text-3xl font-bold mt-1 ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {totalProfit >= 0 ? '+' : ''}{formatCurrency(totalProfit)}
          </p>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-500">Loading...</div>
        ) : ledger.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-500">No ledger entries found</div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="sm:hidden space-y-3">
              {ledger.map((entry: any) => (
                <div key={entry.match.id} className="bg-white rounded-xl shadow-sm border p-4">
                  <p className="text-sm font-medium text-gray-900 mb-1">{entry.match.team1} vs {entry.match.team2}</p>
                  {entry.match.matchWinner && (
                    <p className="text-xs text-gray-500 mb-2">Won by: {entry.match.matchWinner}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex gap-3">
                      <div>
                        <span className="text-xs text-gray-500">Won</span>
                        <p className="text-sm font-medium text-green-600">{formatCurrency(entry.totalWon)}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Lost</span>
                        <p className="text-sm font-medium text-red-600">{formatCurrency(entry.totalLost)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-gray-500">P&L</span>
                      <p className={`text-sm font-bold ${entry.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {entry.profit >= 0 ? '+' : ''}{formatCurrency(entry.profit)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Match</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Won By</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Lena (Won)</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Dena (Lost)</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {ledger.map((entry: any) => (
                      <tr key={entry.match.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-900">{entry.match.team1} vs {entry.match.team2}</p>
                          <p className="text-xs text-gray-500">{formatDate(entry.match.startTime)}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{entry.match.matchWinner || '-'}</td>
                        <td className="px-4 py-3 text-sm text-right text-green-600 font-medium">
                          {entry.totalWon > 0 ? formatCurrency(entry.totalWon) : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-red-600 font-medium">
                          {entry.totalLost > 0 ? formatCurrency(entry.totalLost) : '-'}
                        </td>
                        <td className={`px-4 py-3 text-sm text-right font-bold ${entry.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {entry.profit >= 0 ? '+' : ''}{formatCurrency(entry.profit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
