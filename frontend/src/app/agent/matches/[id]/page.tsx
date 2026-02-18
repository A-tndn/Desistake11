'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { adminService } from '@/services/admin.service';
import { matchService } from '@/services/match.service';
import { agentService } from '@/services/agent.service';
import { formatDate, formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { ArrowLeft, Save, Trophy, AlertTriangle, RefreshCw, BarChart3 } from 'lucide-react';

export default function MatchManagePage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.id as string;
  const [match, setMatch] = useState<any>(null);
  const [bets, setBets] = useState<any[]>([]);
  const [ladder, setLadder] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settling, setSettling] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [oddsForm, setOddsForm] = useState({
    team1BackOdds: '', team1LayOdds: '', team2BackOdds: '', team2LayOdds: '', drawBackOdds: '', drawLayOdds: '',
  });
  const [settleForm, setSettleForm] = useState({ winner: '' });
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => { loadData(); }, [matchId]);

  // Auto-refresh bets every 5 seconds for live matches
  useEffect(() => {
    if (!autoRefresh || match?.status !== 'LIVE') return;
    const interval = setInterval(() => { loadDownlineBets(); }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, match?.status, matchId]);

  const loadData = async () => {
    try {
      const matchRes = await matchService.getMatchById(matchId);
      const m = (matchRes as any).data || matchRes;
      setMatch(m);
      setOddsForm({
        team1BackOdds: m.team1BackOdds?.toString() || '',
        team1LayOdds: m.team1LayOdds?.toString() || '',
        team2BackOdds: m.team2BackOdds?.toString() || '',
        team2LayOdds: m.team2LayOdds?.toString() || '',
        drawBackOdds: m.drawBackOdds?.toString() || '',
        drawLayOdds: m.drawLayOdds?.toString() || '',
      });
      loadDownlineBets();
    } catch (err) { console.error('Failed to load match', err); }
    finally { setLoading(false); }
  };

  const loadDownlineBets = useCallback(async () => {
    try {
      const res: any = await agentService.getMatchBets(matchId);
      const data = (res as any).data || res;
      setBets(data?.bets || []);
      setLadder(data?.ladder || []);
    } catch {
      try {
        const betsRes = await adminService.getMatchBets(matchId, { limit: 50 });
        setBets((betsRes as any)?.data?.bets || (betsRes as any)?.data || []);
      } catch { /* ignore */ }
    }
  }, [matchId]);

  const handleSaveOdds = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const data: any = {};
      Object.entries(oddsForm).forEach(([k, v]) => { if (v) data[k] = parseFloat(v); });
      await adminService.updateMatchOdds(matchId, data);
      setMessage({ type: 'success', text: 'Odds updated' });
      loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update odds' });
    } finally { setSaving(false); }
  };

  const handleSettle = async () => {
    if (!settleForm.winner) { setMessage({ type: 'error', text: 'Select a winner' }); return; }
    setSettling(true);
    try {
      await adminService.settleMatch(matchId, { winner: settleForm.winner });
      setMessage({ type: 'success', text: 'Match settled!' });
      loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Settlement failed' });
    } finally { setSettling(false); }
  };

  const handleVoid = async () => {
    if (!confirm('Void all bets for this match? This will refund all pending bets.')) return;
    try {
      await adminService.voidMatch(matchId, 'Voided by admin');
      setMessage({ type: 'success', text: 'Match voided and bets refunded' });
      loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to void' });
    }
  };

  // Calculate total amounts per selection
  const fancyTotals: Record<string, number> = {};
  for (const bet of bets) {
    const key = bet.betOn || 'Unknown';
    fancyTotals[key] = (fancyTotals[key] || 0) + Number(bet.amount || 0);
  }

  if (loading) return <div className="text-center py-12 text-muted-foreground text-sm">Loading...</div>;
  if (!match) return <div className="text-center py-12 text-muted-foreground text-sm">Match not found</div>;

  return (
    <div>
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground/80 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Match header */}
      <div className="bg-card rounded-xl border p-5 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full',
            match.status === 'LIVE' ? 'bg-red-100 text-red-700' :
            match.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700')}>
            {match.status}
          </span>
          {match.isSettled && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Settled</span>}
          {match.status === 'LIVE' && (
            <button onClick={() => setAutoRefresh(!autoRefresh)}
              className={cn('ml-auto flex items-center gap-1 px-2 py-1 rounded text-xs font-medium',
                autoRefresh ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground')}>
              <RefreshCw className={cn('w-3 h-3', autoRefresh && 'animate-spin')} />
              {autoRefresh ? 'Live' : 'Paused'}
            </button>
          )}
        </div>
        <h2 className="text-lg font-bold text-foreground">{match.name}</h2>
        <p className="text-sm text-muted-foreground">{match.team1} vs {match.team2} - {formatDate(match.startTime)}</p>
      </div>

      {message.text && (
        <div className={cn('mb-3 p-3 rounded-lg text-sm', message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}>
          {message.text}
        </div>
      )}

      {/* Ladder / Position Summary */}
      {ladder.length > 0 && (
        <div className="bg-card rounded-xl border p-4 mb-4">
          <h3 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-brand-teal" /> Position Ladder
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {ladder.map((l: any) => (
              <div key={l.team} className={cn('rounded-lg border p-3',
                l.net > 0 ? 'border-green-200 bg-green-50' : l.net < 0 ? 'border-red-200 bg-red-50' : 'border-border')}>
                <p className="text-sm font-bold text-foreground">{l.team}</p>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-blue-600">Back: {formatCurrency(l.totalBack)}</span>
                  <span className="text-xs text-red-500">Lay: {formatCurrency(l.totalLay)}</span>
                </div>
                <p className={cn('text-sm font-bold mt-1',
                  l.net > 0 ? 'text-green-600' : l.net < 0 ? 'text-red-600' : 'text-foreground')}>
                  Net: {l.net > 0 ? '+' : ''}{formatCurrency(l.net)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fancy totals indicator */}
      {Object.keys(fancyTotals).length > 0 && (
        <div className="bg-card rounded-xl border p-4 mb-4">
          <h3 className="font-semibold text-foreground text-sm mb-2">Total Amount per Selection (Fancy)</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(fancyTotals).map(([key, amt]) => (
              <div key={key} className="px-3 py-1.5 rounded-lg bg-muted text-sm">
                <span className="font-medium">{key}:</span>{' '}
                <span className="font-bold text-brand-teal">{formatCurrency(amt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Odds editor */}
        <div className="bg-card rounded-xl border p-5">
          <h3 className="font-semibold text-foreground text-sm mb-3">Edit Odds</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: `${match.team1} Back`, key: 'team1BackOdds', color: 'border-back' },
              { label: `${match.team1} Lay`, key: 'team1LayOdds', color: 'border-lay' },
              { label: `${match.team2} Back`, key: 'team2BackOdds', color: 'border-back' },
              { label: `${match.team2} Lay`, key: 'team2LayOdds', color: 'border-lay' },
              { label: 'Draw Back', key: 'drawBackOdds', color: 'border-back' },
              { label: 'Draw Lay', key: 'drawLayOdds', color: 'border-lay' },
            ].map(({ label, key, color }) => (
              <div key={key}>
                <label className="block text-xs text-muted-foreground mb-1">{label}</label>
                <input type="number" step="0.01" value={(oddsForm as any)[key]}
                  onChange={(e) => setOddsForm({ ...oddsForm, [key]: e.target.value })}
                  className={cn('w-full px-3 py-2 border-2 rounded-lg text-sm font-bold focus:outline-none', color)} />
              </div>
            ))}
          </div>
          <button onClick={handleSaveOdds} disabled={saving}
            className="mt-3 px-4 py-2 bg-brand-teal text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-1">
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Update Odds'}
          </button>
        </div>

        {/* Settlement */}
        {!match.isSettled && (
          <div className="bg-card rounded-xl border p-5">
            <h3 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4" /> Settle Match
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Winner</label>
                <select value={settleForm.winner} onChange={(e) => setSettleForm({ winner: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm">
                  <option value="">Select winner...</option>
                  <option value={match.team1}>{match.team1}</option>
                  <option value={match.team2}>{match.team2}</option>
                  <option value="DRAW">Draw</option>
                </select>
              </div>
              <button onClick={handleSettle} disabled={settling}
                className="w-full py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-1">
                <Trophy className="w-4 h-4" /> {settling ? 'Settling...' : 'Settle Match'}
              </button>
              <button onClick={handleVoid}
                className="w-full py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 flex items-center justify-center gap-1">
                <AlertTriangle className="w-4 h-4" /> Void Match (Refund All)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Downline Bets */}
      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold text-foreground text-sm">Downline Bets ({bets.length})</h3>
          <button onClick={loadDownlineBets} className="text-xs text-brand-teal hover:underline flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
        {bets.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">No bets from your players on this match</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted border-b">
                <tr>
                  {['Player', 'Type', 'Selection', 'B/L', 'Amount', 'Odds', 'Potential Win', 'Status'].map((h) => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {bets.map((bet: any) => (
                  <tr key={bet.id} className="hover:bg-muted text-xs">
                    <td className="px-4 py-2">
                      <p className="text-sm font-medium">{bet.user?.displayName || bet.userId}</p>
                      <p className="text-[10px] text-muted-foreground">@{bet.user?.username}</p>
                    </td>
                    <td className="px-4 py-2">{bet.betType}</td>
                    <td className="px-4 py-2 font-medium">{bet.betOn}</td>
                    <td className="px-4 py-2">
                      <span className={cn('font-medium', bet.isBack ? 'text-blue-600' : 'text-red-500')}>
                        {bet.isBack ? 'BACK' : 'LAY'}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-medium">{formatCurrency(Number(bet.amount))}</td>
                    <td className="px-4 py-2">{Number(bet.odds).toFixed(2)}</td>
                    <td className="px-4 py-2 font-medium text-green-600">{formatCurrency(Number(bet.potentialWin))}</td>
                    <td className="px-4 py-2">
                      <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium',
                        bet.status === 'WON' ? 'bg-green-100 text-green-700' :
                        bet.status === 'LOST' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700')}>
                        {bet.status}
                      </span>
                    </td>
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
