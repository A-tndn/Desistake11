'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { agentService } from '@/services/agent.service';
import { formatCurrency, formatDate } from '@/lib/utils';
import Navbar from '@/components/Navbar';

export default function AgentCommissions() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || user?.type !== 'agent') { router.push('/login'); return; }
    loadData();
  }, [isAuthenticated]);

  const loadData = async () => {
    try {
      const res = await agentService.getCommissionReport();
      setCommissions((res as any).data || []);
    } catch (error) {
      console.error('Failed to load commissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalCommission = commissions.reduce((sum, c) => sum + Number(c.commissionAmount), 0);
  const paidCommission = commissions.filter(c => c.paid).reduce((sum, c) => sum + Number(c.commissionAmount), 0);
  const unpaidCommission = commissions.filter(c => !c.paid).reduce((sum, c) => sum + Number(c.commissionAmount), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Commission Lena Dena</h2>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border">
            <p className="text-xs text-gray-500">Total Commission</p>
            <p className="text-lg font-bold text-purple-600 mt-1">{formatCurrency(totalCommission)}</p>
          </div>
          <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border">
            <p className="text-xs text-gray-500">Paid</p>
            <p className="text-lg font-bold text-green-600 mt-1">{formatCurrency(paidCommission)}</p>
          </div>
          <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border">
            <p className="text-xs text-gray-500">Unpaid</p>
            <p className="text-lg font-bold text-orange-600 mt-1">{formatCurrency(unpaidCommission)}</p>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-500">Loading...</div>
        ) : commissions.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-500">No commissions earned yet</div>
        ) : (
          <>
            {/* Mobile */}
            <div className="sm:hidden space-y-3">
              {commissions.map((c: any) => (
                <div key={c.id} className="bg-white rounded-xl shadow-sm border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {c.bet?.match?.team1} vs {c.bet?.match?.team2}
                      </p>
                      <p className="text-xs text-gray-500">Player: {c.bet?.user?.displayName || c.bet?.user?.username}</p>
                    </div>
                    <span className="text-sm font-bold text-purple-600">{formatCurrency(Number(c.commissionAmount))}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Rate: {Number(c.commissionRate).toFixed(2)}%</span>
                    <span className={`px-2 py-0.5 rounded-full font-medium ${c.paid ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                      {c.paid ? 'Paid' : 'Unpaid'}
                    </span>
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
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Match</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Player</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bet</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Bet Amount</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rate</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Commission</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {commissions.map((c: any) => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {c.bet?.match?.team1} vs {c.bet?.match?.team2}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{c.bet?.user?.displayName || c.bet?.user?.username}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{c.bet?.betOn}</td>
                        <td className="px-4 py-3 text-sm text-right">{formatCurrency(Number(c.bet?.amount || 0))}</td>
                        <td className="px-4 py-3 text-sm text-right">{Number(c.commissionRate).toFixed(2)}%</td>
                        <td className="px-4 py-3 text-sm text-right font-bold text-purple-600">{formatCurrency(Number(c.commissionAmount))}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.paid ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                            {c.paid ? 'Paid' : 'Unpaid'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-500">{formatDate(c.createdAt)}</td>
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
