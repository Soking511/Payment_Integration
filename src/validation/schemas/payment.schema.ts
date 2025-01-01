import { body, param } from 'express-validator';

export const createPaymentIntentSchema = [
  body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number greater than 0.01')
    .customSanitizer(value => {
      // Ensure value is a number
      return parseFloat(value);
    }),
  body('currency')
    .notEmpty()
    .withMessage('Currency is required')
    .isString()
    .withMessage('Currency must be a string')
    .trim()
    .toUpperCase()
    .isIn(['USD', 'EUR', 'GBP'])
    .withMessage('Currency must be one of: USD, EUR, GBP')
];

export const paymentIdSchema = [
  param('id')
    .notEmpty()
    .withMessage('Payment ID is required')
    .isString()
    .withMessage('Payment ID must be a string')
];

export const refundPaymentSchema = [
  param('id')
    .notEmpty()
    .withMessage('Payment ID is required')
    .isString()
    .withMessage('Payment ID must be a string'),
  body('amount')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Refund amount must be a positive number greater than 0.01')
    .customSanitizer(value => {
      return value ? parseFloat(value) : undefined;
    }),
  body('reason')
    .optional()
    .isString()
    .withMessage('Refund reason must be a string')
];
