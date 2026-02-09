import Joi from 'joi';

export const loginSchema = Joi.object({
  username: Joi.string().required().min(3).max(50),
  password: Joi.string().required().min(6),
  userType: Joi.string().valid('player', 'agent').default('player'),
});

export const registerPlayerSchema = Joi.object({
  username: Joi.string().required().min(3).max(50).alphanum(),
  password: Joi.string().required().min(6).max(100),
  displayName: Joi.string().required().min(2).max(100),
  email: Joi.string().email().optional(),
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .optional(),
  creditLimit: Joi.number().min(0).default(10000),
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().required().min(6).max(100),
});
