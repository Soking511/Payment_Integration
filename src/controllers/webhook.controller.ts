import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/apiError';
import stripe from '../config/stripe';
import Stripe from 'stripe';
import asyncHandler from '../utils/asyncHandler';

export const handleWebhook = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const signature = req.headers['stripe-signature'];
  if (!process.env.STRIPE_WEBHOOK_SECRET) 
    throw new ApiError(500, 'Webhook secret is not configured');

  if (!signature)
    throw new ApiError(400, 'No signature found in request headers');

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody || req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.log(`⚠️ Webhook signature verification failed.`);
    res.status(400).json({
      error: {
        message: `Webhook Error: ${err}`
      }
    });
    return;
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`PaymentIntent for ${paymentIntent.amount} was successful!`);

        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`❌ Payment failed: ${paymentIntent.id}`);
        console.log('Error:', paymentIntent.last_payment_error?.message);

        break;
      }

      case 'payment_method.attached': {
        const paymentMethod = event.data.object as Stripe.PaymentMethod;

        break;
      }

      default: {
        console.log(`Unhandled event type ${event.type}`);
      }
    }

    res.json({ received: true });
  } catch (err) {
    next(err);
  }
});
