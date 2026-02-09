import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { successResponse, errorResponse } from '../utils/response';
import matchService from '../services/match.service';

export const getMatches = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status, matchType, tournament, limit } = req.query;

  const matches = await matchService.getMatches({
    status: status as any,
    matchType: matchType as any,
    tournament: tournament as string,
    limit: limit ? parseInt(limit as string) : undefined,
  });

  successResponse(res, 'Matches retrieved successfully', matches);
});

export const getMatchById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const match = await matchService.getMatchById(id);

  if (!match) {
    return errorResponse(res, 'Match not found', 404);
  }

  successResponse(res, 'Match retrieved successfully', match);
});

export const syncMatches = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await matchService.syncMatches();
  successResponse(res, 'Matches synced successfully', result);
});

export const updateScores = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await matchService.updateMatchScores();
  successResponse(res, 'Scores updated successfully', result);
});
