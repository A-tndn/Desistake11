'use client';

import { useEffect, useState } from 'react';
import { agentService } from '@/services/agent.service';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Target } from 'lucide-react';

export default function CurrentBetsPage() {
  const [bets, setBets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadBets(); }, []);

  const loadBets = async () => {
    try {
      const res = await agentService.getCurrentBets();
      setBets((res as any).data || []);
    } catch (err) { console.error('Failed to load current bets', err); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-4">
        <Target className="w-5 h-5 text-brand-teal" /> Current Bets (Pending)
      </h2>

      <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground text-sm">Loading...</div>
        ) : bets.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">No pending bets from your players</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900 text-white">
                <tr>
                  {['Player', 'Match', 'Selection', 'B/L', 'Amount', 'Odds', 'Potential Win', 'Placed At'].map(h => (
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
                    <td className="px-3 py-2 text-xs">{bet.match?.name || '-'}</td>
                    <td className="px-3 py-2 text-xs font-medium">{bet.betOn}</td>
                    <td className="px-3 py-2">
                      <span className={cn('text-xs font-bold', bet.isBack ? 'text-blue-600' : 'text-red-500')}>
                        {bet.isBack ? 'BACK' : 'LAY'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm font-medium">{formatCurrency(Number(bet.amount))}</td>
                    <td className="px-3 py-2 text-xs">{Number(bet.odds).toFixed(2)}</td>
                    <td className="px-3 py-2 text-sm font-medium text-green-600">{formatCurrency(Number(bet.potentialWin))}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{formatDate(bet.createdAt)}</td>
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
