import Stripe from 'stripe';
import { ApiError } from '../utils/apiError';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new ApiError(500, 'Stripe secret key is not configured');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
});

export const createPaymentIntent = async (
  amount: number,
  currency: string,
  description?: string
) => {
  try {
    return await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), 
      currency,
      description,
      automatic_payment_methods: {
        enabled: true,
      },
    });
  } catch (error) {
    throw new ApiError(400, `Failed to create payment intent: ${error}`);
  }
};

export const retrievePaymentIntent = async (id: string) => {
  try {
    return await stripe.paymentIntents.retrieve(id);
  } catch (error) {
    throw new ApiError(404, `Payment intent not found: ${error}`);
  }
};

export const refundPayment = async (paymentIntentId: string, amount?: number) => {
  try {
    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: paymentIntentId,
    };

    if (amount) {
      refundParams.amount = Math.round(amount * 100); // Convert to cents
    }

    return await stripe.refunds.create(refundParams);
  } catch (error) {
    throw new ApiError(400, `Failed to process refund: ${error}`);
  }
};

export const constructWebhookEvent = (
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
) => {
  try {
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    throw new ApiError(400, `Webhook Error: ${error}`);
  }
};

export default stripe;