import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/apiError';
import { stripe } from '../config/stripe';
import { PaymentTransaction } from '../utils/transaction.manager';

interface PaymentResponse {
  status: 'success' | 'error';
  data?: any;
  error?: string;
}

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const handlePaymentResponse = (res: Response, result: any): void => {
  const response: PaymentResponse = {
    status: 'success',
    data: {
      id: result.id,
      status: result.status,
      client_secret: result.client_secret
    }
  };

  // Remove undefined fields
  Object.keys(response.data).forEach(key => {
    if (response.data[key] === undefined) {
      delete response.data[key];
    }
  });

  res.status(200).json(response);
};

export const createPaymentIntent = asyncHandler(async (req: Request, res: Response) => {
  const { amount, currency } = req.body;

  if (!amount || !currency) {
    throw new ApiError(400, 'Amount and currency are required');
  }

  if (amount <= 0) {
    throw new ApiError(400, 'Amount must be greater than 0');
  }

  const transaction = new PaymentTransaction();
  const result = await transaction
    .createPaymentIntent(amount, currency)
    .then(t => t.execute());

  handlePaymentResponse(res, result);
});

export const confirmPayment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, 'Payment intent ID is required');
  }

  const transaction = new PaymentTransaction();
  const result = await transaction
    .confirmPayment(id)
    .then(t => t.execute());

  handlePaymentResponse(res, result);
});

export const getPaymentStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, 'Payment intent ID is required');
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(id);
  
  const response: PaymentResponse = {
    status: 'success',
    data: {
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency
    }
  };

  res.status(200).json(response);
});

export const handleWebhook = asyncHandler(async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];

  if (!sig) {
    throw new ApiError(400, 'No Stripe signature found');
  }

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    switch (event.type) {
      case 'payment_intent.succeeded':
        console.log('Payment succeeded:', event.data.object);
        break;
      case 'payment_intent.payment_failed':
        console.log('Payment failed:', event.data.object);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    throw new ApiError(400, `Webhook Error: ${err}`);
  }
});
