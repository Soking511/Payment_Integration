import { Request, Response, NextFunction } from 'express';
import { createClient } from 'redis';

export class CacheService {
  private redis!: ReturnType<typeof createClient>;
  private static instance: CacheService;
  private connected: boolean = false;
  private connectionPromise: Promise<void> | null = null;

  private constructor() {
    if (process.env.NODE_ENV === 'test') {
      // In test environment, don't create real Redis client
      this.connected = true;
      return;
    }

    if (!process.env.REDIS_URL) {
      throw new Error('REDIS_URL environment variable is not set');
    }

    const redisUrl = process.env.REDIS_URL;
    this.redis = createClient({
      url: redisUrl
    });

    this.redis.on('error', (err) => {
      console.error('Redis Client Error:', err);
      this.connected = false;
    });

    this.redis.on('connect', () => {
      console.log('Redis Client Connected');
      this.connected = true;
    });

    this.redis.on('end', () => {
      console.log('Redis Client Connection Closed');
      this.connected = false;
    });
  }

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  private async ensureConnection(): Promise<void> {
    if (process.env.NODE_ENV === 'test' || this.connected) return;

    if (!this.connectionPromise) {
      this.connectionPromise = (async () => {
        try {
          await this.redis.connect();
          this.connected = true;
        } catch (error) {
          console.error('Failed to connect to Redis:', error);
          throw new Error(`Redis connection failed: ${error}`);
        } finally {
          this.connectionPromise = null;
        }
      })();
    }

    await this.connectionPromise;
  }

  async get(key: string): Promise<string | null> {
    if (process.env.NODE_ENV === 'test') return null;

    try {
      await this.ensureConnection();
      return await this.redis.get(key);
    } catch (error) {
      console.error(`Error getting key ${key} from Redis:`, error);
      throw error;
    }
  }

  async set(key: string, value: string, expirationSeconds?: number): Promise<void> {
    if (process.env.NODE_ENV === 'test') return;

    try {
      await this.ensureConnection();
      if (expirationSeconds) {
        await this.redis.set(key, value, {
          EX: expirationSeconds
        });
      } else {
        await this.redis.set(key, value);
      }
    } catch (error) {
      console.error(`Error setting key ${key} in Redis:`, error);
      throw error;
    }
  }

  async del(key: string): Promise<void> {
    if (process.env.NODE_ENV === 'test') return;

    try {
      await this.ensureConnection();
      await this.redis.del(key);
    } catch (error) {
      console.error(`Error deleting key ${key} from Redis:`, error);
      throw error;
    }
  }

  async isConnected(): Promise<boolean> {
    if (process.env.NODE_ENV === 'test') return true;
    
    try {
      await this.ensureConnection();
      return this.connected;
    } catch {
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (process.env.NODE_ENV === 'test' || !this.connected) return;

    await this.redis.quit();
    this.connected = false;
  }
}

export const cacheMiddleware = (duration: number): ((req: Request, res: Response, next: NextFunction) => Promise<void>) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (req.method !== 'GET') {
      next();
      return;
    }

    const cacheService = CacheService.getInstance();
    const key = `__express__${req.originalUrl || req.url}`;

    try {
      const cachedResponse = await cacheService.get(key);

      if (cachedResponse) {
        res.send(JSON.parse(cachedResponse));
        return;
      } else {
        const oldSend = res.send;
        res.send = function (body: any): Response {
          oldSend.call(this, body);
          cacheService.set(key, JSON.stringify(body), duration);
          return this;
        };
        next();
      }
    } catch (error) {
      next();
    }
  };
};

export const clearCache = async (pattern: string): Promise<void> => {
  const cacheService = CacheService.getInstance();
  await cacheService.del(pattern);
};
