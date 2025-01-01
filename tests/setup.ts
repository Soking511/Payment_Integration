import 'mocha';
import * as chai from 'chai';
import sinonChai from 'sinon-chai';
import sinon from 'sinon';

chai.use(sinonChai);

process.env.NODE_ENV = 'test';
process.env.STRIPE_SECRET_KEY = 'test_key';
process.env.REDIS_URL = 'redis://localhost:6379';

before(() => {
});

after(() => {
  sinon.restore();
});
