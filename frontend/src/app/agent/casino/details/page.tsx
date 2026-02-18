'use client';

import { useEffect, useState } from 'react';
import { agentService } from '@/services/agent.service';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Dices, Search } from 'lucide-react';

export default function CasinoDetailsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => { loadData(); }, [page]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await agentService.getCasinoDetails({ page, limit: 20 });
      setData((res as any).data || res);
    } catch (err) { console.error('Failed to load casino details', err); }
    finally { setLoading(false); }
  };

  const bets = data?.bets || [];
  const total = data?.total || 0;

  return (
    <div>
      <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-4">
        <Dices className="w-5 h-5 text-brand-teal" /> Casino Details & Bet Report
      </h2>

      <div className="mb-3 text-sm text-muted-foreground">
        Showing casino bets placed by your downline players. Total: {total} bets
      </div>

      <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground text-sm">Loading casino data...</div>
        ) : bets.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">No casino bets found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900 text-white">
                <tr>
                  {['Player', 'Game', 'Bet Type', 'Amount', 'Odds', 'Win', 'Status', 'Date'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {bets.map((bet: any) => (
                  <tr key={bet.id} className="hover:bg-muted/30">
                    <td className="px-3 py-2">
                      <p className="text-sm font-medium">{bet.user?.displayName}</p>
                      <p className="text-[10px] text-muted-foreground">@{bet.user?.username}</p>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {bet.round?.game?.gameName || 'Unknown'}
                      <span className="text-muted-foreground ml-1">({bet.round?.game?.gameType?.replace('_', ' ')})</span>
                    </td>
                    <td className="px-3 py-2 text-xs font-medium">{bet.betType}</td>
                    <td className="px-3 py-2 text-sm font-medium">{formatCurrency(Number(bet.amount))}</td>
                    <td className="px-3 py-2 text-xs">{Number(bet.odds).toFixed(2)}</td>
                    <td className="px-3 py-2">
                      <span className={cn('text-sm font-medium',
                        bet.status === 'WON' ? 'text-green-600' : bet.status === 'LOST' ? 'text-red-600' : 'text-yellow-600')}>
                        {bet.status === 'WON' ? formatCurrency(Number(bet.actualWin)) : bet.status === 'LOST' ? '-' + formatCurrency(Number(bet.amount)) : 'Pending'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium',
                        bet.status === 'WON' ? 'bg-green-100 text-green-700' :
                        bet.status === 'LOST' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700')}>
                        {bet.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{formatDate(bet.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div className="mt-3 flex justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 border rounded text-sm disabled:opacity-50">Prev</button>
          <span className="px-3 py-1.5 text-sm text-muted-foreground">Page {page} of {Math.ceil(total / 20)}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 20)}
            className="px-3 py-1.5 border rounded text-sm disabled:opacity-50">Next</button>
        </div>
      )}
    </div>
  );
}
