'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { agentService } from '@/services/agent.service';
import { formatCurrency, formatDate } from '@/lib/utils';
import Navbar from '@/components/Navbar';

export default function AgentAccountStatement() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ from: '', to: '', type: '' });

  useEffect(() => {
    if (!isAuthenticated || user?.type !== 'agent') { router.push('/login'); return; }
    loadData();
  }, [isAuthenticated]);

  const loadData = async () => {
    try {
      const params: any = {};
      if (filter.from) params.from = filter.from;
      if (filter.to) params.to = filter.to;
      if (filter.type) params.type = filter.type;
      const res = await agentService.getAccountStatement(params);
      setTransactions((res as any).data || []);
    } catch (error) {
      console.error('Failed to load statement:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type: string) => {
    if (type.includes('CREDIT')) return 'text-green-600';
    if (type.includes('DEBIT')) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Account Statement</h2>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
              <input type="date" value={filter.from} onChange={(e) => setFilter({ ...filter, from: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
              <input type="date" value={filter.to} onChange={(e) => setFilter({ ...filter, to: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
              <select value={filter.type} onChange={(e) => setFilter({ ...filter, type: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
                <option value="">All</option>
                <option value="CREDIT_TRANSFER">Credit Transfer</option>
                <option value="DEBIT_TRANSFER">Debit Transfer</option>
                <option value="COMMISSION_EARNED">Commission</option>
              </select>
            </div>
            <div className="flex items-end">
              <button onClick={() => { setLoading(true); loadData(); }}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                Filter
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-500">Loading...</div>
        ) : transactions.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-500">No transactions found</div>
        ) : (
          <>
            {/* Mobile */}
            <div className="sm:hidden space-y-3">
              {transactions.map((tx: any) => (
                <div key={tx.id} className="bg-white rounded-xl shadow-sm border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                      {tx.type.replace(/_/g, ' ')}
                    </span>
                    <span className={`text-sm font-bold ${getTypeColor(tx.type)}`}>
                      {formatCurrency(Number(tx.amount))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Bal: {formatCurrency(Number(tx.balanceAfter))}</span>
                    <span>{formatDate(tx.createdAt)}</span>
                  </div>
                  {tx.description && <p className="text-xs text-gray-400 mt-1">{tx.description}</p>}
                </div>
              ))}
            </div>

            {/* Desktop */}
            <div className="hidden sm:block bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance Before</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance After</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {transactions.map((tx: any) => (
                      <tr key={tx.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-500">{formatDate(tx.createdAt)}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-medium">
                            {tx.type.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-sm text-right font-medium ${getTypeColor(tx.type)}`}>
                          {formatCurrency(Number(tx.amount))}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-500">{formatCurrency(Number(tx.balanceBefore))}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(Number(tx.balanceAfter))}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 truncate max-w-xs">{tx.description || '-'}</td>
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
