import { Router } from "express";
import { validate } from "../middleware/validate.middleware";
import { hasRole, isAuthenticated } from "../middleware/auth.middleware";
import { paymentLimiter, webhookLimiter } from "../middleware/rate-limit.middleware";
import { cacheMiddleware } from "../middleware/cache.middleware"; 
import {
  createPaymentIntentSchema,
  paymentIdSchema,
  refundPaymentSchema,
} from "../validation/schemas/payment.schema";
import {
  createPaymentIntent,
  getPaymentStatus,
  confirmPayment,
  handleWebhook
} from "../controllers/payment.controller";
import { IUserRole } from "../interfaces";
import webhookRouter from "./webhook.route";

const paymentRouter = Router();

// Webhook route should be first to avoid middleware interference
paymentRouter.use('/webhook', webhookRouter);

// Payment Intent routes
paymentRouter.post(
  "/create",
  isAuthenticated,
  hasRole('admin' as IUserRole),
  validate(createPaymentIntentSchema),
  paymentLimiter,
  createPaymentIntent
);

paymentRouter.post(
  "/confirm/:id",
  isAuthenticated,
  hasRole('admin' as IUserRole),
  confirmPayment
);

paymentRouter.get(
  "/status/:id",
  isAuthenticated,
  hasRole('admin' as IUserRole),
  validate(paymentIdSchema),
  cacheMiddleware(30),
  getPaymentStatus
);

export default paymentRouter;
