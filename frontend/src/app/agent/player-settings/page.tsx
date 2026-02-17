'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { agentService } from '@/services/agent.service';
import { formatCurrency } from '@/lib/utils';
import { showToast } from '@/components/Toast';
import Navbar from '@/components/Navbar';

interface PlayerSettings {
  id: string;
  username: string;
  displayName: string;
  balance?: number;
  creditLimit?: number;
  status?: string;
  bookmakerDelay: number;
  sessionDelay: number;
  matchDelay: number;
  bookmakerMinStack: number;
  bookmakerMaxStack: number;
  betDeleteAllowed: boolean;
  agent?: { username: string; displayName: string };
}

export default function PlayerSettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [players, setPlayers] = useState<PlayerSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerSettings | null>(null);
  const [editForm, setEditForm] = useState({
    bookmakerDelay: 3,
    sessionDelay: 3,
    matchDelay: 4,
    bookmakerMinStack: 100,
    bookmakerMaxStack: 200000,
    betDeleteAllowed: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || user?.type !== 'agent') {
      router.push('/login');
      return;
    }
    // Only MASTER and SUPER_MASTER can access
    if (user?.role !== 'MASTER' && user?.role !== 'SUPER_MASTER') {
      router.push('/agent/dashboard');
      return;
    }
    loadPlayers();
  }, [isAuthenticated]);

  const loadPlayers = async () => {
    try {
      const res = await agentService.getMasterAllPlayers();
      setPlayers((res as any).data || []);
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'Access Denied',
        message: error.response?.data?.message || 'Failed to load players',
      });
      router.push('/agent/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlayer = async (player: PlayerSettings) => {
    setSelectedPlayer(player);
    setEditForm({
      bookmakerDelay: player.bookmakerDelay,
      sessionDelay: player.sessionDelay,
      matchDelay: player.matchDelay,
      bookmakerMinStack: Number(player.bookmakerMinStack),
      bookmakerMaxStack: Number(player.bookmakerMaxStack),
      betDeleteAllowed: player.betDeleteAllowed,
    });
  };

  const handleSave = async () => {
    if (!selectedPlayer) return;
    setSaving(true);

    try {
      await agentService.updatePlayerBettingSettings(selectedPlayer.id, editForm);
      showToast({
        type: 'success',
        title: 'Settings Updated',
        message: `Betting settings for ${selectedPlayer.displayName || selectedPlayer.username} updated`,
      });

      // Refresh the player list
      const res = await agentService.getMasterAllPlayers();
      setPlayers((res as any).data || []);

      // Update selected player
      const updated = ((res as any).data || []).find((p: any) => p.id === selectedPlayer.id);
      if (updated) setSelectedPlayer(updated);
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'Update Failed',
        message: error.response?.data?.message || 'Failed to update settings',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Player Betting Settings</h2>
            <p className="text-sm text-gray-500 mt-1">Master Agent Only - Configure delay, stakes & permissions</p>
          </div>
          <button
            onClick={() => router.push('/agent/dashboard')}
            className="text-sm text-blue-600 hover:underline"
          >
            Back to Dashboard
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading players...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Player List */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border">
                <div className="p-4 border-b">
                  <h3 className="font-semibold text-gray-900 text-sm">Select Player</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{players.length} players in hierarchy</p>
                </div>
                <div className="max-h-[60vh] overflow-y-auto divide-y">
                  {players.map((player) => (
                    <button
                      key={player.id}
                      onClick={() => handleSelectPlayer(player)}
                      className={`w-full text-left p-3 sm:p-4 hover:bg-gray-50 transition ${
                        selectedPlayer?.id === player.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{player.displayName || player.username}</p>
                          <p className="text-xs text-gray-500">@{player.username}</p>
                          {player.agent && (
                            <p className="text-[10px] text-gray-400 mt-0.5">Agent: {player.agent.displayName}</p>
                          )}
                        </div>
                        <div className="text-right">
                          {player.betDeleteAllowed && (
                            <span className="inline-block px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 rounded">
                              DEL
                            </span>
                          )}
                          <p className="text-xs text-gray-500 mt-0.5">
                            {player.matchDelay}s / {player.sessionDelay}s / {player.bookmakerDelay}s
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                  {players.length === 0 && (
                    <div className="p-8 text-center text-gray-500 text-sm">No players found</div>
                  )}
                </div>
              </div>
            </div>

            {/* Settings Panel */}
            <div className="lg:col-span-2">
              {selectedPlayer ? (
                <div className="bg-white rounded-xl shadow-sm border">
                  <div className="p-4 sm:p-5 border-b">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {selectedPlayer.displayName || selectedPlayer.username}
                        </h3>
                        <p className="text-sm text-gray-500">@{selectedPlayer.username}</p>
                      </div>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        selectedPlayer.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {selectedPlayer.status}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 space-y-6">
                    {/* Delay Settings */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Bet Confirmation Delays
                      </h4>
                      <p className="text-xs text-gray-500 mb-3">
                        Bet will only be accepted if odds remain unchanged during this period
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Match Delay (seconds)</label>
                          <input
                            type="number"
                            value={editForm.matchDelay}
                            onChange={(e) => setEditForm({ ...editForm, matchDelay: parseInt(e.target.value) || 0 })}
                            min="0"
                            max="30"
                            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Session Delay (seconds)</label>
                          <input
                            type="number"
                            value={editForm.sessionDelay}
                            onChange={(e) => setEditForm({ ...editForm, sessionDelay: parseInt(e.target.value) || 0 })}
                            min="0"
                            max="30"
                            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Bookmaker Delay (seconds)</label>
                          <input
                            type="number"
                            value={editForm.bookmakerDelay}
                            onChange={(e) => setEditForm({ ...editForm, bookmakerDelay: parseInt(e.target.value) || 0 })}
                            min="0"
                            max="30"
                            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Stack Limits */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Bookmaker Stack Limits
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Minimum Stack</label>
                          <input
                            type="number"
                            value={editForm.bookmakerMinStack}
                            onChange={(e) => setEditForm({ ...editForm, bookmakerMinStack: parseFloat(e.target.value) || 0 })}
                            min="0"
                            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Maximum Stack</label>
                          <input
                            type="number"
                            value={editForm.bookmakerMaxStack}
                            onChange={(e) => setEditForm({ ...editForm, bookmakerMaxStack: parseFloat(e.target.value) || 0 })}
                            min="0"
                            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Bet Delete Permission */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Bet Delete Permission
                      </h4>
                      <p className="text-xs text-gray-500 mb-3">
                        Only visible to Master Agents. Sub-agents cannot see or modify this setting.
                      </p>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setEditForm({ ...editForm, betDeleteAllowed: !editForm.betDeleteAllowed })}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            editForm.betDeleteAllowed ? 'bg-blue-600' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              editForm.betDeleteAllowed ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                        <span className="text-sm text-gray-700">
                          {editForm.betDeleteAllowed ? 'Allowed - Player can delete/edit bets within 30s' : 'Not Allowed (Default)'}
                        </span>
                      </div>
                      {editForm.betDeleteAllowed && (
                        <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                          <p className="text-xs text-amber-700">
                            This player can delete pending bets within 30 seconds of placement. This setting is hidden from regular agents.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Save Button */}
                    <div className="pt-2">
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full sm:w-auto px-8 py-3 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 disabled:opacity-50 transition"
                      >
                        {saving ? 'Saving...' : 'Save Settings'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="text-gray-500 text-sm">Select a player from the list to configure their betting settings</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
