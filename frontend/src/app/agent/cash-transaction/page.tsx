'use client';

import { useEffect, useState } from 'react';
import { agentService } from '@/services/agent.service';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { CreditCard, Plus } from 'lucide-react';

export default function CashTransactionPage() {
  const [players, setPlayers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ clientId: '', amount: '', paymentType: 'CASH', remark: '' });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [playersRes, txRes] = await Promise.all([
        agentService.getPlayers(),
        agentService.getCashTransactions().catch(() => ({ data: [] })),
      ]);
      setPlayers((playersRes as any).data || []);
      setTransactions((txRes as any).data || []);
    } catch (err) { console.error('Failed', err); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ type: '', text: '' });
    try {
      await agentService.createCashTransaction({
        clientId: form.clientId,
        amount: parseFloat(form.amount),
        paymentType: form.paymentType,
        remark: form.remark || undefined,
      });
      setMessage({ type: 'success', text: 'Transaction created' });
      setForm({ clientId: '', amount: '', paymentType: 'CASH', remark: '' });
      loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed' });
    } finally { setSubmitting(false); }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-4">
        <CreditCard className="w-5 h-5 text-brand-teal" /> Cash Transaction
      </h2>

      {message.text && (
        <div className={cn('mb-4 p-3 rounded-lg text-sm',
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200')}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border p-5">
          <h3 className="font-semibold text-foreground text-sm mb-3">New Transaction</h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Client</label>
              <select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} required
                className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="">Select client...</option>
                {players.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.displayName} (@{p.username})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Amount</label>
              <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                min="1" required className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Payment Type</label>
              <select value={form.paymentType} onChange={(e) => setForm({ ...form, paymentType: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="BANK">Bank Transfer</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Remark</label>
              <input type="text" value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Optional" />
            </div>
            <button type="submit" disabled={submitting}
              className="w-full py-2.5 bg-brand-teal text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
              {submitting ? 'Processing...' : 'Create Transaction'}
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 bg-card rounded-xl border overflow-hidden">
          <div className="p-4 border-b"><h3 className="font-semibold text-foreground text-sm">Recent Transactions</h3></div>
          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading...</div>
          ) : transactions.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No cash transactions yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted border-b">
                  <tr>
                    {['Date', 'Client', 'Amount', 'Type', 'Remark'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {transactions.map((t: any, idx: number) => (
                    <tr key={t.id || idx} className="hover:bg-muted/30">
                      <td className="px-3 py-2 text-xs text-muted-foreground">{formatDate(t.createdAt)}</td>
                      <td className="px-3 py-2 text-xs">{t.client?.displayName || t.clientId || '-'}</td>
                      <td className="px-3 py-2 text-sm font-medium">{formatCurrency(Number(t.amount))}</td>
                      <td className="px-3 py-2 text-xs">{t.paymentType}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{t.remark || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
