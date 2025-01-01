import { body, param } from 'express-validator';

export const createAdminValidation = [
  body('username').isString().trim().isLength({ min: 3, max: 50 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isString().isLength({ min: 6 }),
  body('role').default('admin')
];

export const updateAdminValidation = [
  param('id').isMongoId(),
  body('username').optional().isString().trim().isLength({ min: 3, max: 50 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('password').optional().isString().isLength({ min: 6 })
];

export const checkAdminIDValidation = [
  param('id').isMongoId()
];
