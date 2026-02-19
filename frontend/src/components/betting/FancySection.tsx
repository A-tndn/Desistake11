'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useBetStore } from '@/store/betStore';
import { Info, BookOpen, X, ChevronDown, ChevronUp } from 'lucide-react';

interface FancyMarket {
  id: string;
  marketName: string;
  category: string;
  noValue: number | string | null;
  yesValue: number | string | null;
  noRate: number | string;
  yesRate: number | string;
  isSuspended: boolean;
  isActive: boolean;
  minBet: number | string;
  maxBet: number | string;
}

interface FancySectionProps {
  matchId: string;
  matchName: string;
  markets: FancyMarket[];
  locked: boolean;
}

// ===== Smart categorization based on market name patterns =====
function categorizeMarket(m: FancyMarket): string {
  const name = m.marketName.toLowerCase();
  // Over-based totals (6 over, 10 over, 15 over, 20 over runs)
  if (/^\d+\s*over\s*run/i.test(m.marketName)) return 'OVER_RUNS';
  if (name.includes('over run') && /\d+\s*over/i.test(name)) return 'OVER_RUNS';
  // Per-over session (Match 1st over run, 2nd over run, 3rd over etc.)
  if (/match\s*\d+(st|nd|rd|th)\s*over/i.test(m.marketName)) return 'PER_OVER';
  if (/\d+(st|nd|rd|th)\s*over\s*run/i.test(m.marketName)) return 'PER_OVER';
  // Toss
  if (name.includes('toss') || name.includes('win the toss')) return 'TOSS';
  // Fall of wickets
  if (name.includes('fall of') || name.includes('wkt') || name.includes('wicket')) return 'WICKETS';
  // Boundaries
  if (name.includes('boundaries') || name.includes('fours') || name.includes('sixes') || name.includes('4s') || name.includes('6s') || name.includes('boundary')) return 'BOUNDARIES';
  // Player runs - has player-like pattern (not over-based)
  if (/\b(run|runs)\b/i.test(name) && !name.includes('over')) return 'PLAYER_RUNS';
  // Use DB category as fallback
  if (m.category === 'PLAYER_RUNS') return 'PLAYER_RUNS';
  if (m.category === 'BOUNDARIES') return 'BOUNDARIES';
  if (m.category === 'WICKETS') return 'WICKETS';
  if (m.category === 'OVER_RUNS') return 'OVER_RUNS';
  return 'SESSION';
}

const SECTION_CONFIG: { key: string; label: string; color: string; defaultOpen: boolean }[] = [
  { key: 'TOSS',         label: 'Toss',                            color: 'bg-yellow-700',      defaultOpen: true },
  { key: 'OVER_RUNS',    label: 'Over Runs (6/10/15/20 Overs)',    color: 'bg-emerald-700',     defaultOpen: true },
  { key: 'PER_OVER',     label: 'Per Over Session',                color: 'bg-teal-700',        defaultOpen: true },
  { key: 'SESSION',      label: 'Session / Fancy',                 color: 'bg-brand-teal-dark', defaultOpen: true },
  { key: 'WICKETS',      label: 'Fall of Wicket',                  color: 'bg-red-800',         defaultOpen: false },
  { key: 'PLAYER_RUNS',  label: 'Player Runs',                     color: 'bg-indigo-700',      defaultOpen: false },
  { key: 'BOUNDARIES',   label: 'Boundaries (4s/6s)',              color: 'bg-amber-700',       defaultOpen: false },
];

export default function FancySection({ matchId, matchName, markets, locked }: FancySectionProps) {
  const { addToBetSlip } = useBetStore();
  const [infoModal, setInfoModal] = useState<FancyMarket | null>(null);
  const [bookModal, setBookModal] = useState<FancyMarket | null>(null);

  // Initialize collapsed state from config defaults
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    SECTION_CONFIG.forEach((s) => {
      init[s.key] = !s.defaultOpen;
    });
    return init;
  });

  // Group markets by smart category
  const grouped = useMemo(() => {
    const groups: Record<string, FancyMarket[]> = {};
    markets.forEach((m) => {
      const cat = categorizeMarket(m);
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(m);
    });
    // Sort each group numerically by first number in name
    Object.values(groups).forEach((arr) =>
      arr.sort((a, b) => {
        const numA = parseInt(a.marketName.match(/\d+/)?.[0] || '999');
        const numB = parseInt(b.marketName.match(/\d+/)?.[0] || '999');
        if (numA !== numB) return numA - numB;
        return a.marketName.localeCompare(b.marketName);
      })
    );
    return groups;
  }, [markets]);

  const toggleSection = (key: string) => {
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (!markets || markets.length === 0) {
    return (
      <div className="bg-card rounded-lg border overflow-hidden">
        <div className="bg-brand-teal-dark px-4 py-2">
          <h3 className="text-sm font-bold text-white">FANCY / SESSION</h3>
        </div>
        <div className="p-6 text-center text-sm text-muted-foreground">
          No fancy markets available for this match
        </div>
      </div>
    );
  }

  const handleFancyClick = (market: FancyMarket, isYes: boolean) => {
    if (locked || market.isSuspended) return;
    const value = isYes ? Number(market.yesValue) : Number(market.noValue);
    const rate = isYes ? Number(market.yesRate) : Number(market.noRate);
    if (!value || !rate) return;

    const odds = (rate / 100) + 1;

    addToBetSlip({
      matchId,
      matchName,
      betType: 'FANCY',
      betOn: `${isYes ? 'YES' : 'NO'}_${value}`,
      odds,
      isBack: isYes,
      fancyMarketId: market.id,
      fancyMarketName: market.marketName,
      runValue: value,
    });
  };

  const generateLadder = (market: FancyMarket) => {
    const noVal = Number(market.noValue) || 0;
    const yesVal = Number(market.yesValue) || 0;
    const center = Math.round((noVal + yesVal) / 2);
    const rows = [];
    for (let i = center - 5; i <= center + 5; i++) {
      if (i < 0) continue;
      rows.push({
        runs: i,
        exposure: i < noVal ? -100 : i >= yesVal ? 100 : 0,
      });
    }
    return rows;
  };

  const renderMarketRow = (market: FancyMarket, idx: number, total: number) => {
    const noVal = market.noValue != null ? Number(market.noValue) : null;
    const yesVal = market.yesValue != null ? Number(market.yesValue) : null;
    const noRate = Number(market.noRate);
    const yesRate = Number(market.yesRate);
    const suspended = market.isSuspended;
    const clickable = !locked && !suspended;

    return (
      <div
        key={market.id}
        className={cn(
          'grid grid-cols-[1fr_160px] items-center px-3 py-2',
          idx < total - 1 && 'border-b border-border/50',
          'hover:bg-muted/30 transition relative'
        )}
      >
        <div className="pr-2 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-[13px] font-medium text-foreground truncate flex-1">
              {market.marketName}
            </span>
            <button
              onClick={() => setInfoModal(market)}
              className="p-0.5 hover:bg-muted rounded transition flex-shrink-0"
              title="Market rules"
            >
              <Info className="w-3.5 h-3.5 text-blue-500" />
            </button>
            <button
              onClick={() => setBookModal(market)}
              className="p-0.5 hover:bg-muted rounded transition flex-shrink-0"
              title="Position/Ladder"
            >
              <BookOpen className="w-3.5 h-3.5 text-purple-500" />
            </button>
          </div>
          <span className="text-[10px] text-muted-foreground">
            Min: {Number(market.minBet)} | Max: {Number(market.maxBet)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 relative">
          {/* NO (KHAI) */}
          <button
            onClick={clickable && noVal ? () => handleFancyClick(market, false) : undefined}
            disabled={!clickable || !noVal}
            className={cn(
              'flex flex-col items-center py-1.5 px-1 rounded transition-all',
              'bg-lay hover:bg-lay-dark text-foreground',
              (!clickable || !noVal) && 'opacity-50 cursor-not-allowed',
              clickable && noVal && 'cursor-pointer active:scale-95',
            )}
          >
            <span className="text-sm font-bold">{noVal ?? '-'}</span>
            <span className="text-[10px] text-muted-foreground">{noRate}</span>
          </button>

          {/* YES (LAGAI) */}
          <button
            onClick={clickable && yesVal ? () => handleFancyClick(market, true) : undefined}
            disabled={!clickable || !yesVal}
            className={cn(
              'flex flex-col items-center py-1.5 px-1 rounded transition-all',
              'bg-back hover:bg-back-dark text-foreground',
              (!clickable || !yesVal) && 'opacity-50 cursor-not-allowed',
              clickable && yesVal && 'cursor-pointer active:scale-95',
            )}
          >
            <span className="text-sm font-bold">{yesVal ?? '-'}</span>
            <span className="text-[10px] text-muted-foreground">{yesRate}</span>
          </button>

          {suspended && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-red-600 font-bold text-xs tracking-wider">
                SUSPENDED
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const activeSections = SECTION_CONFIG.filter((sec) => grouped[sec.key]?.length > 0);

  return (
    <>
      <div className="space-y-2">
        {activeSections.map((sec) => {
          const isCollapsed = collapsedSections[sec.key];
          const sectionMarkets = grouped[sec.key];
          return (
            <div key={sec.key} className="bg-card rounded-lg border overflow-hidden">
              {/* Section Header - clickable toggle */}
              <button
                onClick={() => toggleSection(sec.key)}
                className={cn(
                  'w-full px-3 py-2 flex items-center justify-between',
                  sec.color
                )}
              >
                <div className="flex items-center gap-2">
                  <h3 className="text-[13px] font-bold text-white">{sec.label}</h3>
                  <span className="text-[10px] bg-white/20 text-white px-1.5 py-0.5 rounded-full font-medium">
                    {sectionMarkets.length}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {!isCollapsed && (
                    <div className="flex gap-6 text-[10px] font-bold mr-1">
                      <span className="text-lay-light w-14 text-center">NO</span>
                      <span className="text-back-light w-14 text-center">YES</span>
                    </div>
                  )}
                  {isCollapsed ? (
                    <ChevronDown className="w-4 h-4 text-white/80" />
                  ) : (
                    <ChevronUp className="w-4 h-4 text-white/80" />
                  )}
                </div>
              </button>

              {/* Section Body - collapsible */}
              {!isCollapsed && (
                <div>
                  {sectionMarkets.map((market, idx) =>
                    renderMarketRow(market, idx, sectionMarkets.length)
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Info Modal */}
      {infoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setInfoModal(null)}>
          <div className="bg-card rounded-xl border shadow-2xl w-full max-w-sm p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-500" /> Market Rules
              </h3>
              <button onClick={() => setInfoModal(null)} className="p-1 hover:bg-muted rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 text-xs text-muted-foreground">
              <p><strong className="text-foreground">{infoModal.marketName}</strong></p>
              <p>Category: {infoModal.category}</p>
              <p>Min Bet: {Number(infoModal.minBet)} | Max Bet: {Number(infoModal.maxBet)}</p>
              <hr className="border-border" />
              <p className="font-medium text-foreground">Rules:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>If the actual runs scored match or exceed YES value, YES bets win.</li>
                <li>If the actual runs are below the NO value, NO bets win.</li>
                <li>Bets are settled based on the final match result.</li>
                <li>If the match is abandoned, all bets on this market will be voided.</li>
                <li>In case of no result, bets will be voided and stakes returned.</li>
                <li>The company reserves the right to void bets in case of foul play.</li>
                <li>Advance fancy bets will be suspended before toss. Valid only after toss.</li>
                <li>Session bets will be valid only after match starts.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Book/Ladder Modal */}
      {bookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setBookModal(null)}>
          <div className="bg-card rounded-xl border shadow-2xl w-full max-w-xs p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-purple-500" /> Position / Ladder
              </h3>
              <button onClick={() => setBookModal(null)} className="p-1 hover:bg-muted rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-2">{bookModal.marketName}</p>
            <div className="border rounded-lg overflow-hidden">
              <div className="grid grid-cols-2 bg-muted text-[10px] font-bold text-muted-foreground">
                <div className="px-3 py-1.5 text-center border-r">Runs</div>
                <div className="px-3 py-1.5 text-center">Exposure</div>
              </div>
              {generateLadder(bookModal).map((row) => (
                <div key={row.runs} className={cn(
                  'grid grid-cols-2 text-xs border-t',
                  row.exposure > 0 && 'bg-green-50',
                  row.exposure < 0 && 'bg-red-50'
                )}>
                  <div className="px-3 py-1 text-center border-r font-medium">{row.runs}</div>
                  <div className={cn(
                    'px-3 py-1 text-center font-semibold',
                    row.exposure > 0 ? 'text-green-600' : row.exposure < 0 ? 'text-red-600' : 'text-muted-foreground'
                  )}>
                    {row.exposure > 0 ? '+' : ''}{row.exposure}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 text-center">
              Place bets to see your actual position
            </p>
          </div>
        </div>
      )}
    </>
  );
}
