'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { userService } from '@/services/user.service';
import { formatCurrency, formatDate } from '@/lib/utils';
import Navbar from '@/components/Navbar';

export default function AccountStatementPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: 'all',
    fromDate: '',
    toDate: '',
    page: 1,
  });

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    loadTransactions();
  }, [isAuthenticated, filters]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const params: any = { page: filters.page, limit: 20 };
      if (filters.type !== 'all') params.type = filters.type;
      if (filters.fromDate) params.fromDate = filters.fromDate;
      if (filters.toDate) params.toDate = filters.toDate;
      const res = await userService.getTransactions(params);
      const data = (res as any).data;
      setTransactions(data?.transactions || []);
      setPagination(data?.pagination || null);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setFilters({ type: 'all', fromDate: '', toDate: '', page: 1 });
  };

  const getTypeColor = (type: string) => {
    if (type.includes('CREDIT') || type === 'BET_WON' || type === 'DEPOSIT' || type === 'BET_REFUND') return 'text-green-600';
    return 'text-red-600';
  };

  const isCredit = (type: string) => {
    return ['CREDIT_TRANSFER', 'BET_WON', 'DEPOSIT', 'BET_REFUND'].includes(type);
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
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value, page: 1 })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="all">All</option>
                <option value="DEPOSIT">Deposit</option>
                <option value="WITHDRAWAL">Withdrawal</option>
                <option value="BET_PLACED">Bet Placed</option>
                <option value="BET_WON">Bet Won</option>
                <option value="BET_LOST">Bet Lost</option>
                <option value="BET_REFUND">Bet Refund</option>
                <option value="CREDIT_TRANSFER">Credit Received</option>
                <option value="DEBIT_TRANSFER">Debit</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
              <input type="date" value={filters.fromDate} onChange={(e) => setFilters({ ...filters, fromDate: e.target.value, page: 1 })} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
              <input type="date" value={filters.toDate} onChange={(e) => setFilters({ ...filters, toDate: e.target.value, page: 1 })} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div className="flex items-end">
              <button onClick={resetFilters} className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">Reset</button>
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
            {/* Mobile cards */}
            <div className="sm:hidden space-y-3">
              {transactions.map((tx: any, i: number) => (
                <div key={tx.id} className="bg-white rounded-xl shadow-sm border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500">#{(filters.page - 1) * 20 + i + 1}</span>
                    <span className="text-xs text-gray-400">{formatDate(tx.createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-medium ${isCredit(tx.type) ? 'text-green-600' : 'text-red-600'}`}>
                      {isCredit(tx.type) ? '+' : '-'}{formatCurrency(Number(tx.amount))}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{formatCurrency(Number(tx.balanceAfter))}</span>
                  </div>
                  <p className="text-xs text-gray-500">{tx.description || tx.type.replace(/_/g, ' ')}</p>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Sr.</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Debit</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Credit</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {transactions.map((tx: any, i: number) => (
                      <tr key={tx.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-500">{formatDate(tx.createdAt)}</td>
                        <td className="px-4 py-3 text-sm text-center text-gray-500">{(filters.page - 1) * 20 + i + 1}</td>
                        <td className="px-4 py-3 text-sm text-right text-red-600 font-medium">
                          {!isCredit(tx.type) ? formatCurrency(Number(tx.amount)) : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-green-600 font-medium">
                          {isCredit(tx.type) ? formatCurrency(Number(tx.amount)) : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-green-700">
                          {formatCurrency(Number(tx.balanceAfter))}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{tx.description || tx.type.replace(/_/g, ' ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-gray-500">
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} records)
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                    disabled={filters.page <= 1}
                    className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                    disabled={filters.page >= pagination.totalPages}
                    className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
