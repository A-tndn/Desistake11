'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { agentService } from '@/services/agent.service';
import { formatCurrency } from '@/lib/utils';
import Navbar from '@/components/Navbar';

export default function AgentClientLedger() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || user?.type !== 'agent') { router.push('/login'); return; }
    loadData();
  }, [isAuthenticated]);

  const loadData = async () => {
    try {
      const res = await agentService.getClientLedger();
      setLedger((res as any).data || []);
    } catch (error) {
      console.error('Failed to load client ledger:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalBalance = ledger.reduce((sum, p) => sum + p.balance, 0);
  const totalNetPL = ledger.reduce((sum, p) => sum + p.netPL, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">All Client Ledger</h2>

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border">
            <p className="text-xs text-gray-500">Total Clients</p>
            <p className="text-lg font-bold text-gray-900 mt-1">{ledger.length}</p>
          </div>
          <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border">
            <p className="text-xs text-gray-500">Total Client Balance</p>
            <p className="text-lg font-bold text-green-600 mt-1">{formatCurrency(totalBalance)}</p>
          </div>
          <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border">
            <p className="text-xs text-gray-500">Net P&L</p>
            <p className={`text-lg font-bold mt-1 ${totalNetPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totalNetPL)}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-500">Loading...</div>
        ) : ledger.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-500">No clients found</div>
        ) : (
          <>
            {/* Mobile */}
            <div className="sm:hidden space-y-3">
              {ledger.map((client: any) => (
                <div key={client.id} className="bg-white rounded-xl shadow-sm border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{client.displayName}</p>
                      <p className="text-xs text-gray-500">@{client.username}</p>
                    </div>
                    <span className={`text-sm font-bold ${client.netPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(client.netPL)}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-gray-500">Balance</p>
                      <p className="font-medium">{formatCurrency(client.balance)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Won</p>
                      <p className="font-medium text-green-600">{formatCurrency(client.totalWon)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Lost</p>
                      <p className="font-medium text-red-600">{formatCurrency(client.totalLost)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop */}
            <div className="hidden sm:block bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Bets</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Staked</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Lena (Won)</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Dena (Lost)</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Net P&L</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {ledger.map((client: any) => (
                      <tr key={client.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-900">{client.displayName}</p>
                          <p className="text-xs text-gray-500">@{client.username}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(client.balance)}</td>
                        <td className="px-4 py-3 text-sm text-right">{client.totalBets}</td>
                        <td className="px-4 py-3 text-sm text-right">{formatCurrency(client.totalBetAmount)}</td>
                        <td className="px-4 py-3 text-sm text-right text-green-600 font-medium">{formatCurrency(client.totalWon)}</td>
                        <td className="px-4 py-3 text-sm text-right text-red-600 font-medium">{formatCurrency(client.totalLost)}</td>
                        <td className={`px-4 py-3 text-sm text-right font-bold ${client.netPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(client.netPL)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                    <tr>
                      <td className="px-4 py-3 text-sm font-bold text-gray-900">Total</td>
                      <td className="px-4 py-3 text-sm text-right font-bold">{formatCurrency(totalBalance)}</td>
                      <td className="px-4 py-3 text-sm text-right font-bold">{ledger.reduce((s, c) => s + c.totalBets, 0)}</td>
                      <td className="px-4 py-3 text-sm text-right font-bold">{formatCurrency(ledger.reduce((s, c) => s + c.totalBetAmount, 0))}</td>
                      <td className="px-4 py-3 text-sm text-right text-green-600 font-bold">{formatCurrency(ledger.reduce((s, c) => s + c.totalWon, 0))}</td>
                      <td className="px-4 py-3 text-sm text-right text-red-600 font-bold">{formatCurrency(ledger.reduce((s, c) => s + c.totalLost, 0))}</td>
                      <td className={`px-4 py-3 text-sm text-right font-bold ${totalNetPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(totalNetPL)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
