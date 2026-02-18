import { api } from '@/lib/api';

// ─── Type Definitions ────────────────────────────────────────────────────────

export interface Player {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  phone?: string;
  balance: number;
  creditLimit: number;
  status: 'ACTIVE' | 'SUSPENDED' | 'BLOCKED';
  isLocked: boolean;
  isBetLocked: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  remark?: string;
  matchCommission?: number;
  sessionCommission?: number;
  commissionType?: CommissionType;
}

export interface AgentStats {
  agentId: string;
  agentType: string;
  balance: number;
  creditLimit: number;
  totalCommissions: number;
  unpaidCommissions: number;
  stats: {
    totalPlayers: number;
    totalPlayersBalance: number;
    totalBets: number;
    totalBetsAmount: number;
  };
}

export interface AgentProfile {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  phone?: string;
  agentType: string;
  balance: number;
  creditLimit: number;
  commissionRate: number;
  status: string;
  maxPlayersAllowed: number;
  playerCount: number;
}

export interface CreatePlayerData {
  username: string;
  password: string;
  displayName: string;
  email?: string;
  phone?: string;
  creditLimit: number;
  remark?: string;
  matchCommission?: number;
  sessionCommission?: number;
  commissionType?: CommissionType;
}

export interface UpdatePlayerData {
  displayName?: string;
  email?: string;
  phone?: string;
  creditLimit?: number;
  remark?: string;
}

export type CommissionType = 'BET_BY_BET' | 'LUMP_SUM' | 'NONE';

export interface CommissionData {
  matchCommission: number;
  sessionCommission: number;
  commissionType: CommissionType;
}

export interface PlayerReportFilters {
  from?: string;
  to?: string;
  type?: 'all' | 'bets' | 'transactions' | 'commissions';
}

export interface PlayerReport {
  player: Player;
  summary: {
    totalBets: number;
    won: number;
    lost: number;
    pending: number;
    netPnl: number;
    commissionEarned: number;
  };
  bets: PlayerBet[];
  transactions: PlayerTransaction[];
  commissions: PlayerCommission[];
}

export interface PlayerBet {
  id: string;
  matchName: string;
  type: 'BACK' | 'LAY' | 'SESSION';
  marketName?: string;
  amount: number;
  odds: number;
  status: 'PENDING' | 'WON' | 'LOST' | 'VOID';
  pnl: number;
  createdAt: string;
}

export interface PlayerTransaction {
  id: string;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
}

export interface PlayerCommission {
  id: string;
  matchName: string;
  betAmount: number;
  commissionRate: number;
  commissionAmount: number;
  paid: boolean;
  createdAt: string;
}

export interface MatchPosition {
  matchId: string;
  matchName: string;
  players: MatchPlayerPosition[];
  totals: {
    totalBackAmount: number;
    totalLayAmount: number;
    netPosition: number;
    sessionExposure: number;
  };
}

export interface MatchPlayerPosition {
  playerId: string;
  playerName: string;
  username: string;
  backAmount: number;
  layAmount: number;
  netPosition: number;
  sessionExposure: number;
}

export interface SessionPlusMinus {
  matchId: string;
  matchName: string;
  sessions: SessionMarketData[];
}

export interface SessionMarketData {
  marketId: string;
  marketName: string;
  totalYesBets: number;
  totalNoBets: number;
  yesAmount: number;
  noAmount: number;
  netExposure: number;
  result: string | null;
  status: 'OPEN' | 'CLOSED' | 'SETTLED';
}

export interface MatchBet {
  id: string;
  playerId: string;
  playerName: string;
  username: string;
  team: string;
  type: 'BACK' | 'LAY';
  amount: number;
  odds: number;
  pnl: number;
  status: 'PENDING' | 'WON' | 'LOST' | 'VOID';
  createdAt: string;
}

export interface SessionBet {
  id: string;
  playerId: string;
  playerName: string;
  username: string;
  marketName: string;
  type: 'YES' | 'NO';
  amount: number;
  odds: number;
  runs: number;
  pnl: number;
  status: 'PENDING' | 'WON' | 'LOST' | 'VOID';
  createdAt: string;
}

export interface ClientLedgerEntry {
  id: string;
  date: string;
  description: string;
  credit: number;
  debit: number;
  balance: number;
}

export interface ClientLedgerResult {
  entries: ClientLedgerEntry[];
  summary: {
    totalCredit: number;
    totalDebit: number;
    netAmount: number;
  };
}

export interface ClientLedgerFilters {
  playerId?: string;
  from?: string;
  to?: string;
}

export interface Banner {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  isActive: boolean;
  order: number;
}

export interface GeneratedUsername {
  username: string;
}

export interface PasswordChangeResult {
  password: string;
  username: string;
}

export interface Match {
  id: string;
  name: string;
  teamA: string;
  teamB: string;
  status: 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'CANCELLED';
  startTime: string;
}

export interface HierarchyNode {
  id: string;
  username: string;
  displayName: string;
  agentType: string;
  balance: number;
  subAgents: HierarchyNode[];
  players: {
    id: string;
    username: string;
    displayName: string;
    balance: number;
  }[];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// ─── Agent Service ───────────────────────────────────────────────────────────

class AgentService {
  // ── Player Management ────────────────────────────────────────────────────

  async createPlayer(data: CreatePlayerData) {
    return await api.post<ApiResponse<Player>>('/agents/create-player', data);
  }

  async getPlayers() {
    return await api.get<ApiResponse<Player[]>>('/agents/players');
  }

  async updatePlayer(playerId: string, data: UpdatePlayerData) {
    return await api.put<ApiResponse<Player>>(`/agents/players/${playerId}`, data);
  }

  async togglePlayerLock(playerId: string) {
    return await api.put<ApiResponse<Player>>(`/agents/players/${playerId}/toggle-lock`);
  }

  async togglePlayerBetLock(playerId: string) {
    return await api.put<ApiResponse<Player>>(`/agents/players/${playerId}/toggle-bet-lock`);
  }

  async changePlayerPassword(playerId: string, newPassword?: string) {
    return await api.put<ApiResponse<PasswordChangeResult>>(
      `/agents/players/${playerId}/change-password`,
      newPassword ? { newPassword } : undefined
    );
  }

  async getPlayerReport(playerId: string, filters?: PlayerReportFilters) {
    const params = new URLSearchParams();
    if (filters?.from) params.append('from', filters.from);
    if (filters?.to) params.append('to', filters.to);
    if (filters?.type && filters.type !== 'all') params.append('type', filters.type);
    const query = params.toString();
    return await api.get<ApiResponse<PlayerReport>>(
      `/agents/players/${playerId}/report${query ? `?${query}` : ''}`
    );
  }

  async updatePlayerCommission(playerId: string, data: CommissionData) {
    return await api.put<ApiResponse<Player>>(`/agents/players/${playerId}/commission`, data);
  }

  async generateUsername() {
    return await api.get<ApiResponse<GeneratedUsername>>('/agents/generate-username');
  }

  // ── Credits ──────────────────────────────────────────────────────────────

  async transferCredit(playerId: string, amount: number) {
    return await api.post<ApiResponse<{ agentNewBalance: number; playerNewBalance: number }>>(
      '/agents/transfer-credit',
      { playerId, amount }
    );
  }

  async deductCredit(playerId: string, amount: number) {
    return await api.post<ApiResponse<{ agentNewBalance: number; playerNewBalance: number }>>(
      '/agents/deduct-credit',
      { playerId, amount }
    );
  }

  // ── Agent Info ───────────────────────────────────────────────────────────

  async getStats() {
    return await api.get<ApiResponse<AgentStats>>('/agents/stats');
  }

  async getHierarchy() {
    return await api.get<ApiResponse<HierarchyNode>>('/agents/hierarchy');
  }

  async getAgentProfile() {
    return await api.get<ApiResponse<AgentProfile>>('/agents/profile');
  }

  // ── Reports ──────────────────────────────────────────────────────────────

  async getAccountStatement(filters?: { from?: string; to?: string; userId?: string }) {
    const params = new URLSearchParams();
    if (filters?.from) params.append('from', filters.from);
    if (filters?.to) params.append('to', filters.to);
    if (filters?.userId) params.append('userId', filters.userId);
    const query = params.toString();
    return await api.get<ApiResponse<any>>(`/agents/account-statement${query ? `?${query}` : ''}`);
  }

  async getBetHistory(filters?: { from?: string; to?: string; status?: string }) {
    const params = new URLSearchParams();
    if (filters?.from) params.append('from', filters.from);
    if (filters?.to) params.append('to', filters.to);
    if (filters?.status) params.append('status', filters.status);
    const query = params.toString();
    return await api.get<ApiResponse<any>>(`/agents/reports/bet-history${query ? `?${query}` : ''}`);
  }

  async getClientLedger(playerId?: string) {
    const query = playerId ? `?playerId=${playerId}` : '';
    return await api.get<ApiResponse<ClientLedgerResult>>(`/agents/client-ledger${query}`);
  }

  async getCommissionReport(filters?: { from?: string; to?: string }) {
    const params = new URLSearchParams();
    if (filters?.from) params.append('from', filters.from);
    if (filters?.to) params.append('to', filters.to);
    const query = params.toString();
    return await api.get<ApiResponse<any>>(`/agents/commission-report${query ? `?${query}` : ''}`);
  }

  async getMatchPosition(matchId: string) {
    return await api.get<ApiResponse<MatchPosition>>(
      `/agents/reports/match-position/${matchId}`
    );
  }

  async getSessionPlusMinus(matchId: string) {
    return await api.get<ApiResponse<SessionPlusMinus>>(
      `/agents/reports/session-plus-minus/${matchId}`
    );
  }

  async getMatchBets(matchId: string) {
    return await api.get<ApiResponse<MatchBet[]>>(`/agents/reports/match-bets/${matchId}`);
  }

  async getSessionBets(matchId: string) {
    return await api.get<ApiResponse<SessionBet[]>>(`/agents/reports/session-bets/${matchId}`);
  }

  async getClientLedgerFiltered(filters?: ClientLedgerFilters) {
    const params = new URLSearchParams();
    if (filters?.playerId) params.append('clientId', filters.playerId);
    if (filters?.from) params.append('startDate', filters.from);
    if (filters?.to) params.append('endDate', filters.to);
    const query = params.toString();
    return await api.get<ApiResponse<ClientLedgerResult>>(
      `/agents/reports/client-ledger-filtered${query ? `?${query}` : ''}`
    );
  }

  // ── Banners ──────────────────────────────────────────────────────────────

  async getBanners() {
    return await api.get<ApiResponse<Banner[]>>('/agents/banners');
  }

  async updateBanners(data: { banners: Partial<Banner>[]; enabled?: boolean }) {
    return await api.put<ApiResponse<Banner[]>>('/agents/banners', data);
  }

  // ============================================
  // Phase 2 API Methods
  // ============================================

  async getCasinoDetails(params?: { page?: number; limit?: number; search?: string }) {
    const query = new URLSearchParams();
    if (params?.page) query.append("page", String(params.page));
    if (params?.limit) query.append("limit", String(params.limit));
    if (params?.search) query.append("search", params.search);
    return await api.get<ApiResponse<any>>(`/agents/casino/details?${query}`);
  }

  async getCasinoBetReport(filters?: { clientId?: string; gameType?: string; startDate?: string; endDate?: string }) {
    const query = new URLSearchParams();
    if (filters?.clientId) query.append("clientId", filters.clientId);
    if (filters?.gameType) query.append("gameType", filters.gameType);
    if (filters?.startDate) query.append("startDate", filters.startDate);
    if (filters?.endDate) query.append("endDate", filters.endDate);
    return await api.get<ApiResponse<any>>(`/agents/casino/bet-report?${query}`);
  }

  async getCasinoPosition() {
    return await api.get<ApiResponse<any>>("/agents/casino/position");
  }

  async getMyLedger(filters?: { from?: string; to?: string }) {
    const query = new URLSearchParams();
    if (filters?.from) query.append("from", filters.from);
    if (filters?.to) query.append("to", filters.to);
    return await api.get<ApiResponse<any>>(`/agents/reports/my-ledger?${query}`);
  }

  async getCommissionLenaDena(clientId?: string) {
    const query = clientId ? `?clientId=${clientId}` : "";
    return await api.get<ApiResponse<any>>(`/agents/reports/commission-lena-dena${query}`);
  }

  async createCashTransaction(data: { clientId: string; amount: number; paymentType: string; remark?: string }) {
    return await api.post<ApiResponse<any>>("/agents/cash-transaction", data);
  }

  async getCashTransactions() {
    return await api.get<ApiResponse<any>>("/agents/cash-transactions");
  }

  async getReportDetails(filters?: { userType?: string; userId?: string; reportType?: string; startDate?: string; endDate?: string }) {
    const query = new URLSearchParams();
    if (filters?.userType) query.append("userType", filters.userType);
    if (filters?.userId) query.append("userId", filters.userId);
    if (filters?.reportType) query.append("reportType", filters.reportType);
    if (filters?.startDate) query.append("startDate", filters.startDate);
    if (filters?.endDate) query.append("endDate", filters.endDate);
    return await api.get<ApiResponse<any>>(`/agents/reports/details?${query}`);
  }

  async getCurrentBets(filters?: { teamName?: string; market?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (filters?.teamName) query.append("teamName", filters.teamName);
    if (filters?.market) query.append("market", filters.market);
    if (filters?.page) query.append("page", String(filters.page));
    if (filters?.limit) query.append("limit", String(filters.limit));
    return await api.get<ApiResponse<any>>(`/agents/reports/current-bets?${query}`);
  }

  async changeAgentPassword(data: { oldPassword: string; newPassword: string }) {
    return await api.put<ApiResponse<any>>("/agents/change-password", data);
  }


  // Blackjack Agent Controls
  async getBlackjackGames() {
    return await api.get<any>('/casino/games?includeDisabled=true');
  }

  async getBlackjackSettings(gameId: string) {
    return await api.get<any>(`/casino/blackjack/settings/${gameId}`);
  }

  async updateBlackjackSettings(gameId: string, manipulation: any) {
    return await api.put<any>(`/casino/blackjack/settings/${gameId}`, { manipulation });
  }

  async getBlackjackStats(gameId: string) {
    return await api.get<any>(`/casino/blackjack/stats/${gameId}`);
  }
}

export const agentService = new AgentService();
