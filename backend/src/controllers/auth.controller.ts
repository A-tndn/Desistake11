import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { successResponse } from '../utils/response';
import authService from '../services/auth.service';

export const login = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { username, password, userType } = req.body;

  let result;
  if (userType === 'agent') {
    result = await authService.loginAgent(username, password);
  } else {
    result = await authService.loginPlayer(username, password);
  }

  successResponse(res, 'Login successful', result);
});

export const getMe = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await authService.getMe(req.user!.id, req.user!.type);
  successResponse(res, 'User retrieved successfully', user);
});

export const logout = asyncHandler(async (req: AuthRequest, res: Response) => {
  successResponse(res, 'Logged out successfully');
});
