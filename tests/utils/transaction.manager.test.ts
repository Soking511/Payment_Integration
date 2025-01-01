import * as chai from 'chai';
import sinon from 'sinon';
import { PaymentTransaction } from '../../src/utils/transaction.manager';
import * as stripeModule from '../../src/config/stripe';
import { ApiError } from '../../src/utils/apiError';
import { CacheService } from '../../src/middleware/cache.middleware';

const { expect } = chai;

describe('PaymentTransaction', () => {
  let paymentTransaction: PaymentTransaction;
  let stripeStub: sinon.SinonStub;
  let mockStripe: any;
  let mockRedis: any;

  beforeEach(() => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    
    // Create mock Redis instance
    mockRedis = {
      get: sinon.stub().resolves(null),
      set: sinon.stub().resolves('OK'),
      del: sinon.stub().resolves(1)
    };

    // Create mock Stripe instance
    mockStripe = {
      paymentIntents: {
        create: sinon.stub(),
        confirm: sinon.stub(),
        cancel: sinon.stub(),
        retrieve: sinon.stub()
      },
      refunds: {
        create: sinon.stub()
      }
    };

    // Stub the stripe import
    stripeStub = sinon.stub(stripeModule, 'stripe').get(() => mockStripe);

    // Stub CacheService
    const mockCacheService = {
      get: mockRedis.get,
      set: mockRedis.set,
      del: mockRedis.del,
      isConnected: sinon.stub().resolves(true)
    };

    sinon.stub(CacheService, 'getInstance').returns(mockCacheService as any);
    
    // Create PaymentTransaction instance
    paymentTransaction = new PaymentTransaction();
  });

  afterEach(() => {
    sinon.restore();
    delete process.env.NODE_ENV;
  });

  describe('createPaymentIntent', () => {
    it('should create a payment intent successfully', async () => {
      const mockPaymentIntent = {
        id: 'pi_123',
        amount: 1000,
        currency: 'usd',
        status: 'requires_confirmation'
      };

      mockStripe.paymentIntents.create.resolves(mockPaymentIntent);
      mockRedis.set.resolves('OK');

      const transaction = await paymentTransaction.createPaymentIntent(10, 'usd');
      await transaction.execute();
      
      expect(mockStripe.paymentIntents.create.calledOnce).to.be.true;
      expect(mockStripe.paymentIntents.create.firstCall.args[0]).to.deep.equal({
        amount: 1000,
        currency: 'usd',
        confirm: false
      });
      expect(mockRedis.set.calledOnce).to.be.true;
      expect(mockRedis.set.firstCall.args[0]).to.equal('payment_intent');
      expect(mockRedis.set.firstCall.args[1]).to.equal(mockPaymentIntent.id);
    });

    it('should handle stripe errors when creating payment intent', async () => {
      const stripeError = new Error('Stripe API Error');
      mockStripe.paymentIntents.create.rejects(stripeError);

      const transaction = await paymentTransaction.createPaymentIntent(10, 'usd');
      
      try {
        await transaction.execute();
        expect.fail('Should have thrown an error');
      } catch (err: any) {
        expect(err).to.be.instanceOf(ApiError);
        expect(err.message).to.include('Transaction failed');
      }
    });
  });

  describe('confirmPayment', () => {
    const paymentIntentId = 'pi_123';

    it('should confirm payment successfully', async () => {
      const mockConfirmedPayment = {
        id: paymentIntentId,
        status: 'succeeded'
      };

      mockStripe.paymentIntents.confirm.resolves(mockConfirmedPayment);

      await paymentTransaction.confirmPayment(paymentIntentId);
      await paymentTransaction.execute();

      expect(mockStripe.paymentIntents.confirm.calledOnce).to.be.true;
      expect(mockStripe.paymentIntents.confirm.firstCall.args[0]).to.equal(paymentIntentId);
    });

    it('should handle stripe errors when confirming payment', async () => {
      const stripeError = new Error('Confirmation failed');
      mockStripe.paymentIntents.confirm.rejects(stripeError);

      const transaction = await paymentTransaction.confirmPayment(paymentIntentId);
      
      try {
        await transaction.execute();
        expect.fail('Should have thrown an error');
      } catch (err: any) {
        expect(err).to.be.instanceOf(ApiError);
        expect(err.message).to.include('Transaction failed');
      }
    });
  });

  describe('execute', () => {
    it('should execute all steps in order', async () => {
      const paymentIntentId = 'pi_123';
      const mockPaymentIntent = {
        id: paymentIntentId,
        amount: 1000,
        currency: 'usd'
      };
      const mockConfirmedPayment = {
        id: paymentIntentId,
        status: 'succeeded'
      };

      mockStripe.paymentIntents.create.resolves(mockPaymentIntent);
      mockStripe.paymentIntents.confirm.resolves(mockConfirmedPayment);
      mockRedis.set.resolves('OK');

      await paymentTransaction
        .createPaymentIntent(10, 'usd')
        .then(transaction => transaction.confirmPayment(paymentIntentId))
        .then(transaction => transaction.execute());

      expect(mockStripe.paymentIntents.create.calledOnce).to.be.true;
      expect(mockStripe.paymentIntents.confirm.calledOnce).to.be.true;
      expect(mockStripe.paymentIntents.create.calledBefore(mockStripe.paymentIntents.confirm))
        .to.be.true;
      expect(mockRedis.set.calledOnce).to.be.true;
      expect(mockRedis.set.firstCall.args[0]).to.equal('payment_intent');
      expect(mockRedis.set.firstCall.args[1]).to.equal(mockPaymentIntent.id);
    });

    it('should handle errors and trigger compensation', async () => {
      const paymentIntentId = 'pi_123';
      const mockPaymentIntent = {
        id: paymentIntentId,
        amount: 1000,
        currency: 'usd'
      };

      // First step succeeds
      mockStripe.paymentIntents.create.resolves(mockPaymentIntent);
      mockRedis.set.resolves('OK');
      mockRedis.get.resolves(paymentIntentId);
      
      // Second step fails
      const confirmError = new Error('Confirmation failed');
      mockStripe.paymentIntents.confirm.rejects(confirmError);
      
      // Refund fails but cancel succeeds
      mockStripe.refunds.create.rejects(new Error('Refund failed'));
      mockStripe.paymentIntents.cancel.resolves({ id: paymentIntentId, status: 'canceled' });
      mockRedis.del.resolves();

      // Create transaction with both steps
      const transaction = new PaymentTransaction();
      await transaction.createPaymentIntent(10, 'usd');
      await transaction.confirmPayment(paymentIntentId);

      try {
        await transaction.execute();
        expect.fail('Should have thrown an error');
      } catch (err: any) {
        // Wait for any pending promises to resolve
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Verify first step executed
        expect(mockStripe.paymentIntents.create.calledOnce, 'create should be called').to.be.true;
        expect(mockRedis.set.calledOnce, 'redis set should be called').to.be.true;
        
        // Verify second step attempted but failed
        expect(mockStripe.paymentIntents.confirm.calledOnce, 'confirm should be called').to.be.true;
        
        // Verify compensation was triggered
        expect(mockRedis.get.calledOnce, 'redis get should be called').to.be.true;
        expect(mockStripe.refunds.create.calledOnce, 'refund should be attempted').to.be.true;
        expect(mockStripe.paymentIntents.cancel.calledOnce, 'cancel should be called').to.be.true;
        expect(mockRedis.del.calledOnce, 'redis del should be called').to.be.true;
        
        // Verify error details
        expect(err).to.be.instanceOf(ApiError);
        expect(err.message).to.include('Transaction failed');
        expect(err.message).to.include(confirmError.message);
      }
    });
  });
});
