import { CacheService } from '../middleware/cache.middleware';

export async function checkRedisConnection(): Promise<void> {
  const cacheService = CacheService.getInstance();
  
  try {
    const isConnected = await cacheService.isConnected();
    if (!isConnected) {
      throw new Error('Failed to connect to Redis');
    }
    console.log('✅ Redis connection successful');
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    throw error;
  }
}
