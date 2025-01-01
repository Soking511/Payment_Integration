import rateLimit from 'express-rate-limit';
import { IRateLimitRule } from '../interfaces';

const createRateLimiter = (rule: IRateLimitRule) => {
  return rateLimit({
    windowMs: rule.windowMs,
    max: rule.max,
    message: rule.message,
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Default rate limit rules
export const defaultLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
});

// Stricter rate limit for authentication endpoints
export const authLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, 
  max: 5,
  message: 'Too many login attempts from this IP, please try again after an hour.',
});

// Rate limit for payment endpoints
export const paymentLimiter = createRateLimiter({
  windowMs: 60 * 1000, 
  max: 10,
  message: 'Too many payment requests from this IP, please try again later.',
});

// Rate limit for webhook endpoints
export const webhookLimiter = createRateLimiter({
  windowMs: 1000, 
  max: 10,
  message: 'Too many webhook requests from this IP, please try again later.',
});
