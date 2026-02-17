import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { successResponse } from '../utils/response';
import agentService from '../services/agent.service';

export const createAgent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const createdBy = req.user!.id;
  const data = { ...req.body, createdBy };
  const agent = await agentService.createAgent(data);
  successResponse(res, 'Agent created successfully', agent, 201);
});

export const createPlayer = asyncHandler(async (req: AuthRequest, res: Response) => {
  const agentId = req.user!.id;
  const player = await agentService.createPlayer(agentId, req.body);
  successResponse(res, 'Player created successfully', player, 201);
});

export const transferCredit = asyncHandler(async (req: AuthRequest, res: Response) => {
  const agentId = req.user!.id;
  const { playerId, amount } = req.body;
  const result = await agentService.transferCredit(agentId, playerId, parseFloat(amount));
  successResponse(res, 'Credit transferred successfully', result);
});

export const deductCredit = asyncHandler(async (req: AuthRequest, res: Response) => {
  const agentId = req.user!.id;
  const { playerId, amount } = req.body;
  const result = await agentService.deductCredit(agentId, playerId, parseFloat(amount));
  successResponse(res, 'Credit deducted successfully', result);
});

export const getPlayers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const agentId = req.user!.id;
  const players = await agentService.getAgentPlayers(agentId);
  successResponse(res, 'Players retrieved successfully', players);
});

export const getStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  const agentId = req.user!.id;
  const stats = await agentService.getAgentStats(agentId);
  successResponse(res, 'Stats retrieved successfully', stats);
});

export const getHierarchy = asyncHandler(async (req: AuthRequest, res: Response) => {
  const agentId = req.user!.id;
  const hierarchy = await agentService.getAgentHierarchy(agentId);
  successResponse(res, 'Hierarchy retrieved successfully', hierarchy);
});

// Master Agent Only - Player Betting Settings
export const getPlayerBettingSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
  const agentId = req.user!.id;
  const { playerId } = req.params;
  const settings = await agentService.getPlayerBettingSettings(agentId, playerId);
  successResponse(res, 'Player betting settings retrieved', settings);
});

export const updatePlayerBettingSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
  const agentId = req.user!.id;
  const { playerId } = req.params;
  const result = await agentService.updatePlayerBettingSettings(agentId, playerId, req.body);
  successResponse(res, 'Player betting settings updated', result);
});

export const getMasterAllPlayers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const agentId = req.user!.id;
  const players = await agentService.getMasterAgentAllPlayers(agentId);
  successResponse(res, 'All hierarchy players retrieved', players);
});
