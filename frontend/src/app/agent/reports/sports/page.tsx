'use client';

import { useEffect, useState } from 'react';
import { agentService } from '@/services/agent.service';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { BarChart3 } from 'lucide-react';
import StatsCard from '@/components/admin/StatsCard';
import { FileText, Users, TrendingUp, DollarSign } from 'lucide-react';

export default function SportsReportsPage() {
  const [stats, setStats] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [statsRes, playersRes] = await Promise.all([
        agentService.getStats(),
        agentService.getPlayers(),
      ]);
      setStats((statsRes as any).data);
      setPlayers((playersRes as any).data || []);
    } catch (err) { console.error('Failed', err); }
    finally { setLoading(false); }
  };

  const totalBalance = players.reduce((sum, p: any) => sum + Number(p.balance || 0), 0);
  const totalCredit = players.reduce((sum, p: any) => sum + Number(p.creditLimit || 0), 0);

  return (
    <div>
      <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5 text-brand-teal" /> Sports Reports
      </h2>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="bg-card rounded-xl border h-24 animate-pulse" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <StatsCard title="Total Players" value={players.length} icon={Users} color="blue" />
            <StatsCard title="Players Balance" value={formatCurrency(totalBalance)} icon={DollarSign} color="green" />
            <StatsCard title="Total Credit" value={formatCurrency(totalCredit)} icon={TrendingUp} color="purple" />
            <StatsCard title="Total Bets" value={stats?.stats?.totalBets || 0} icon={FileText} color="orange" />
          </div>

          <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="font-semibold text-foreground text-sm">Player Sports Summary</h3>
            </div>
            {players.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">No players</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted border-b">
                    <tr>
                      {['Player', 'Balance', 'Credit Limit', 'Exposure', 'Status'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {players.map((p: any) => (
                      <tr key={p.id} className="hover:bg-muted">
                        <td className="px-4 py-2.5">
                          <p className="text-sm font-medium">{p.displayName}</p>
                          <p className="text-xs text-muted-foreground">@{p.username}</p>
                        </td>
                        <td className="px-4 py-2.5 text-sm font-medium">{formatCurrency(Number(p.balance || 0))}</td>
                        <td className="px-4 py-2.5 text-sm text-muted-foreground">{formatCurrency(Number(p.creditLimit || 0))}</td>
                        <td className="px-4 py-2.5">
                          <span className={cn('text-sm font-medium',
                            Number(p.creditLimit) - Number(p.balance) > 0 ? 'text-red-600' : 'text-green-600')}>
                            {formatCurrency(Math.abs(Number(p.creditLimit || 0) - Number(p.balance || 0)))}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium',
                            p.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
