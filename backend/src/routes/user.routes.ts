import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import Joi from 'joi';

const router = Router();

router.use(authenticate);

const changePasswordSchema = Joi.object({
  oldPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).max(100).required(),
});

router.get('/profile', userController.getProfile);
router.post('/change-password', validate(changePasswordSchema), userController.changePassword);
router.get('/transactions', userController.getTransactions);
router.get('/ledger', userController.getLedger);
router.get('/completed-games', userController.getCompletedGames);

export default router;
