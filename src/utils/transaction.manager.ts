import { stripe } from '../config/stripe';
import { CacheService } from '../middleware/cache.middleware';
import { ApiError } from './apiError';

interface TransactionStep {
  execute: () => Promise<any>;
  compensate: () => Promise<void>;
}

interface PaymentOperationResult {
  success: boolean;
  data?: any;
  error?: Error;
}

class PaymentOperations {
  private cacheService: CacheService;

  constructor() {
    this.cacheService = CacheService.getInstance();
  }

  async createPayment(amount: number, currency: string): Promise<PaymentOperationResult> {
    try {
      const intent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency,
        confirm: false,
      });
      await this.cacheService.set('payment_intent', intent.id, 3600);
      return { success: true, data: intent };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  async cancelPayment(paymentIntentId: string): Promise<PaymentOperationResult> {
    try {
      const result = await stripe.paymentIntents.cancel(paymentIntentId);
      await this.cacheService.del('payment_intent');
      return { success: true, data: result };
    } catch (error) {
      console.error('Cancel payment failed:', error);
      return { success: false, error: error as Error };
    }
  }

  async confirmPayment(paymentIntentId: string): Promise<PaymentOperationResult> {
    try {
      const confirmed = await stripe.paymentIntents.confirm(paymentIntentId);
      return { success: true, data: confirmed };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  async refundPayment(paymentIntentId: string): Promise<PaymentOperationResult> {
    try {
      const refund = await stripe.refunds.create({ payment_intent: paymentIntentId });
      return { success: true, data: refund };
    } catch (error) {
      console.error('Refund payment failed:', error);
      return { success: false, error: error as Error };
    }
  }
}

export class PaymentTransaction {
  private steps: TransactionStep[] = [];
  private completedSteps: number = 0;
  private operations: PaymentOperations;

  constructor() {
    this.operations = new PaymentOperations();
  }

  async createPaymentIntent(amount: number, currency: string) {
    this.steps.push({
      execute: async () => {
        const result = await this.operations.createPayment(amount, currency);
        if (!result.success) throw result.error;
        return result.data;
      },
      compensate: async () => {
        const paymentIntentId = await CacheService.getInstance().get('payment_intent');
        if (paymentIntentId) {
          const result = await this.operations.cancelPayment(paymentIntentId);
          if (!result.success) throw result.error;
        }
      }
    });
    return this;
  }

  async confirmPayment(paymentIntentId: string) {
    this.steps.push({
      execute: async () => {
        const result = await this.operations.confirmPayment(paymentIntentId);
        if (!result.success) throw result.error;
        return result.data;
      },
      compensate: async () => {
        try {
          // First try refund
          const refundResult = await this.operations.refundPayment(paymentIntentId);
          if (!refundResult.success) {
            // If refund fails, try cancel
            console.error('Refund failed, attempting to cancel payment intent:', refundResult.error);
            const cancelResult = await this.operations.cancelPayment(paymentIntentId);
            if (!cancelResult.success) {
              throw cancelResult.error;
            }
          }
        } catch (error) {
          // Log error but continue with cancel
          console.error('Error during compensation:', error);
          const cancelResult = await this.operations.cancelPayment(paymentIntentId);
          if (!cancelResult.success) {
            throw cancelResult.error;
          }
        }
      }
    });
    return this;
  }

  async execute() {
    const stepsToExecute = [...this.steps];
    let lastResult;
    let failedStepIndex = -1;

    try {
      console.log(`Starting execution with ${stepsToExecute.length} steps`);
      for (let i = 0; i < stepsToExecute.length; i++) {
        const step = stepsToExecute[i];
        console.log(`Executing step ${i + 1}/${stepsToExecute.length}`);
        try {
          lastResult = await step.execute();
          this.completedSteps++; // Increment after successful execution
          console.log(`Step ${i + 1} executed successfully`);
        } catch (stepError) {
          console.log(`Step ${i + 1} failed:`, stepError);
          failedStepIndex = i; // Record which step failed
          throw stepError;
        }
      }
      this.steps = []; // Clear steps after successful execution
      this.completedSteps = 0;
      return lastResult;
    } catch (error) {
      console.log(`Error caught, starting compensation. Completed steps: ${this.completedSteps}, Failed step: ${failedStepIndex + 1}`);
      // If any step fails, trigger compensation in reverse order
      // Include the failed step in compensation
      for (let i = failedStepIndex; i >= 0; i--) {
        try {
          console.log(`Compensating step ${i + 1}`);
          await stepsToExecute[i].compensate();
          console.log(`Step ${i + 1} compensated successfully`);
        } catch (compensationError) {
          console.error(`Compensation failed for step ${i + 1}:`, compensationError);
          // Continue with other compensations even if one fails
        }
      }
      this.steps = []; // Clear steps after compensation
      this.completedSteps = 0;
      if (error instanceof Error) {
        throw new ApiError(400, `Transaction failed: ${error.message}`);
      }
      throw new ApiError(400, `Transaction failed: ${error}`);
    }
  }
}
