'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { agentService } from '@/services/agent.service';
import { formatCurrency, formatDate } from '@/lib/utils';
import Navbar from '@/components/Navbar';

export default function AgentPlayersPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [newPlayer, setNewPlayer] = useState({
    username: '',
    password: '',
    displayName: '',
    email: '',
    phone: '',
    creditLimit: '10000',
  });

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

  const handleCreatePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setMessage({ type: '', text: '' });

    try {
      await agentService.createPlayer({
        username: newPlayer.username,
        password: newPlayer.password,
        displayName: newPlayer.displayName,
        email: newPlayer.email || undefined,
        phone: newPlayer.phone || undefined,
        creditLimit: parseFloat(newPlayer.creditLimit),
      });

      setMessage({ type: 'success', text: 'Player created successfully!' });
      setNewPlayer({ username: '', password: '', displayName: '', email: '', phone: '', creditLimit: '10000' });
      setShowCreateForm(false);
      loadPlayers();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to create player' });
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Players</h2>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            {showCreateForm ? 'Cancel' : '+ Create Player'}
          </button>
        </div>

        {message.text && (
          <div className={`mb-4 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {message.text}
          </div>
        )}

        {/* Create Player Form */}
        {showCreateForm && (
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Create New Player</h3>
            <form onSubmit={handleCreatePlayer} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  type="text"
                  value={newPlayer.username}
                  onChange={(e) => setNewPlayer({ ...newPlayer, username: e.target.value })}
                  required
                  className="w-full px-3 py-2.5 border rounded-lg"
                  placeholder="e.g., john123"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={newPlayer.password}
                  onChange={(e) => setNewPlayer({ ...newPlayer, password: e.target.value })}
                  required
                  minLength={6}
                  className="w-full px-3 py-2.5 border rounded-lg"
                  placeholder="Min 6 characters"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                <input
                  type="text"
                  value={newPlayer.displayName}
                  onChange={(e) => setNewPlayer({ ...newPlayer, displayName: e.target.value })}
                  required
                  className="w-full px-3 py-2.5 border rounded-lg"
                  placeholder="Full Name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Credit Limit</label>
                <input
                  type="number"
                  value={newPlayer.creditLimit}
                  onChange={(e) => setNewPlayer({ ...newPlayer, creditLimit: e.target.value })}
                  min="0"
                  className="w-full px-3 py-2.5 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email (optional)</label>
                <input
                  type="email"
                  value={newPlayer.email}
                  onChange={(e) => setNewPlayer({ ...newPlayer, email: e.target.value })}
                  className="w-full px-3 py-2.5 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
                <input
                  type="text"
                  value={newPlayer.phone}
                  onChange={(e) => setNewPlayer({ ...newPlayer, phone: e.target.value })}
                  className="w-full px-3 py-2.5 border rounded-lg"
                  placeholder="+91..."
                />
              </div>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {createLoading ? 'Creating...' : 'Create Player'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Players Table */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading players...</div>
          ) : players.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No players created yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Player</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Credit Limit</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Last Login</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {players.map((player: any) => (
                    <tr key={player.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{player.displayName}</p>
                        <p className="text-xs text-gray-500">@{player.username}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium">
                        {formatCurrency(Number(player.balance))}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-500">
                        {formatCurrency(Number(player.creditLimit))}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          player.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {player.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-500">
                        {player.lastLoginAt ? formatDate(player.lastLoginAt) : 'Never'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-500">
                        {formatDate(player.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
