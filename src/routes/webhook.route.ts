import { Router } from 'express';
import { webhookLimiter } from '../middleware/rate-limit.middleware';
import { handleWebhook } from '../controllers/webhook.controller';

const webhookRouter = Router();

// Webhook endpoint (public but rate limited)
webhookRouter.post(
  '/',
  webhookLimiter,
  handleWebhook
);

export default webhookRouter;