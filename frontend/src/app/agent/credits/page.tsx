'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { agentService } from '@/services/agent.service';
import { formatCurrency } from '@/lib/utils';
import Navbar from '@/components/Navbar';

export default function AgentCreditsPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionType, setActionType] = useState<'transfer' | 'deduct'>('transfer');
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [amount, setAmount] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (!isAuthenticated || user?.type !== 'agent') {
      router.push('/login');
      return;
    }
    loadPlayers();
  }, [isAuthenticated]);

  const loadPlayers = async () => {
    try {
      const res = await agentService.getPlayers();
      setPlayers((res as any).data || []);
    } catch (error) {
      console.error('Failed to load players:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setMessage({ type: '', text: '' });

    try {
      if (actionType === 'transfer') {
        await agentService.transferCredit(selectedPlayer, parseFloat(amount));
        setMessage({ type: 'success', text: `Successfully transferred ${formatCurrency(parseFloat(amount))}!` });
      } else {
        await agentService.deductCredit(selectedPlayer, parseFloat(amount));
        setMessage({ type: 'success', text: `Successfully deducted ${formatCurrency(parseFloat(amount))}!` });
      }
      setAmount('');
      setSelectedPlayer('');
      loadPlayers();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Transaction failed' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Credit Management</h2>

        {message.text && (
          <div className={`mb-4 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Transfer Form */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Transfer / Deduct Credits</h3>

            <div className="flex rounded-lg bg-gray-100 p-1 mb-4">
              <button
                onClick={() => setActionType('transfer')}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
                  actionType === 'transfer' ? 'bg-white shadow text-green-600' : 'text-gray-500'
                }`}
              >
                Transfer
              </button>
              <button
                onClick={() => setActionType('deduct')}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
                  actionType === 'deduct' ? 'bg-white shadow text-red-600' : 'text-gray-500'
                }`}
              >
                Deduct
              </button>
            </div>

            <form onSubmit={handleAction} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Player</label>
                <select
                  value={selectedPlayer}
                  onChange={(e) => setSelectedPlayer(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 border rounded-lg"
                >
                  <option value="">Choose player...</option>
                  {players.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.displayName} (@{p.username}) - {formatCurrency(Number(p.balance))}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="1"
                  required
                  placeholder="Enter amount"
                  className="w-full px-3 py-2.5 border rounded-lg"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading || !selectedPlayer || !amount}
                className={`w-full py-3 rounded-lg text-white font-medium transition disabled:opacity-50 ${
                  actionType === 'transfer'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {actionLoading
                  ? 'Processing...'
                  : actionType === 'transfer'
                  ? 'Transfer Credits'
                  : 'Deduct Credits'}
              </button>
            </form>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                Your Balance: <span className="font-bold">{formatCurrency(user?.balance || 0)}</span>
              </p>
            </div>
          </div>

          {/* Players Balance List */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border">
            <div className="p-5 border-b">
              <h3 className="font-semibold text-gray-900">Player Balances</h3>
            </div>
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : players.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No players</div>
            ) : (
              <div className="divide-y">
                {players.map((player: any) => (
                  <div key={player.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{player.displayName}</p>
                      <p className="text-sm text-gray-500">@{player.username}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{formatCurrency(Number(player.balance))}</p>
                      <p className="text-xs text-gray-500">Limit: {formatCurrency(Number(player.creditLimit))}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
