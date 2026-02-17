import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { successResponse } from '../utils/response';
import userService from '../services/user.service';

export const getProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const profile = await userService.getProfile(userId);
  successResponse(res, 'Profile retrieved', profile);
});

export const changePassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { oldPassword, newPassword } = req.body;
  const result = await userService.changePassword(userId, oldPassword, newPassword);
  successResponse(res, 'Password changed successfully', result);
});

export const getTransactions = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { type, fromDate, toDate, page, limit } = req.query;
  const result = await userService.getTransactions(userId, {
    type: type as string,
    fromDate: fromDate as string,
    toDate: toDate as string,
    page: page ? parseInt(page as string) : undefined,
    limit: limit ? parseInt(limit as string) : undefined,
  });
  successResponse(res, 'Transactions retrieved', result);
});

export const getLedger = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const result = await userService.getLedger(userId);
  successResponse(res, 'Ledger retrieved', result);
});

export const getCompletedGames = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const result = await userService.getCompletedGames(userId);
  successResponse(res, 'Completed games retrieved', result);
});
