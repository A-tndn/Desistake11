'use client';

import { useEffect, useState } from 'react';
import { agentService } from '@/services/agent.service';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Users, Plus, X } from 'lucide-react';

export default function AgentPlayersPage() {
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [newPlayer, setNewPlayer] = useState({
    username: '', password: '', displayName: '', email: '', phone: '', creditLimit: '10000',
  });

  useEffect(() => { loadPlayers(); }, []);

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
        username: newPlayer.username, password: newPlayer.password,
        displayName: newPlayer.displayName,
        email: newPlayer.email || undefined, phone: newPlayer.phone || undefined,
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
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Users className="w-5 h-5 text-brand-teal" /> Players
        </h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className={cn(
            'px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1',
            showCreateForm ? 'bg-muted/70 text-foreground/80' : 'bg-brand-teal text-white hover:opacity-90'
          )}
        >
          {showCreateForm ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> Create Player</>}
        </button>
      </div>

      {message.text && (
        <div className={cn('mb-4 p-3 rounded-lg text-sm', message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200')}>
          {message.text}
        </div>
      )}

      {showCreateForm && (
        <div className="bg-card rounded-xl shadow-sm border p-5 mb-4">
          <h3 className="font-semibold text-foreground text-sm mb-3">Create New Player</h3>
          <form onSubmit={handleCreatePlayer} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { label: 'Username', key: 'username', type: 'text', required: true, placeholder: 'e.g., john123' },
              { label: 'Password (share with player)', key: 'password', type: 'text', required: true, placeholder: 'Min 6 chars' },
              { label: 'Display Name', key: 'displayName', type: 'text', required: true, placeholder: 'Full Name' },
              { label: 'Credit Limit', key: 'creditLimit', type: 'number', required: true },
              { label: 'Email (optional)', key: 'email', type: 'email' },
              { label: 'Phone (optional)', key: 'phone', type: 'text', placeholder: '+91...' },
            ].map(({ label, key, type, required, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
                <input
                  type={type} value={(newPlayer as any)[key]}
                  onChange={(e) => setNewPlayer({ ...newPlayer, [key]: e.target.value })}
                  required={required} placeholder={placeholder}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand-teal outline-none"
                />
              </div>
            ))}
            <div className="md:col-span-2">
              <button type="submit" disabled={createLoading}
                className="px-5 py-2 bg-brand-teal text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition">
                {createLoading ? 'Creating...' : 'Create Player'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Loading players...</div>
        ) : players.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">No players created yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted border-b">
                <tr>
                  {['Player', 'Balance', 'Credit Limit', 'Status', 'Last Login', 'Created'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {players.map((player: any) => (
                  <tr key={player.id} className="hover:bg-muted">
                    <td className="px-4 py-2.5">
                      <p className="text-sm font-medium text-foreground">{player.displayName}</p>
                      <p className="text-xs text-muted-foreground">@{player.username}</p>
                    </td>
                    <td className="px-4 py-2.5 text-sm font-medium">{formatCurrency(Number(player.balance))}</td>
                    <td className="px-4 py-2.5 text-sm text-muted-foreground">{formatCurrency(Number(player.creditLimit))}</td>
                    <td className="px-4 py-2.5">
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium',
                        player.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                        {player.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{player.lastLoginAt ? formatDate(player.lastLoginAt) : 'Never'}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{formatDate(player.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
