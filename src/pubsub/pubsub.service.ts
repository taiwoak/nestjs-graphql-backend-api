import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import Redis from 'ioredis';

@Injectable()
export class PubSubService implements OnModuleInit, OnModuleDestroy {
  private pubSub: RedisPubSub;

  onModuleInit() {
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);

    const redisOptions = {
      host: redisHost,
      port: redisPort,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    };

    const publisher = new Redis(redisOptions);
    const subscriber = new Redis(redisOptions);

    publisher.on('connect', () => {
      console.log('Redis Publisher connected');
    });

    subscriber.on('connect', () => {
      console.log('Redis Subscriber connected');
    });

    publisher.on('error', (error) => {
      console.error('Redis Publisher error:', error);
    });

    subscriber.on('error', (error) => {
      console.error('Redis Subscriber error:', error);
    });

    this.pubSub = new RedisPubSub({
      publisher,
      subscriber,
    });

    console.log('PubSub Service initialized');
  }

  async onModuleDestroy() {
    await this.pubSub.close();
    console.log('PubSub Service closed');
  }

  getPubSub(): RedisPubSub {
    return this.pubSub;
  }

  async publish(trigger: string, payload: any): Promise<void> {
    try {
      await this.pubSub.publish(trigger, payload);
      console.log(`Published to ${trigger}:`, JSON.stringify(payload));
    } catch (error) {
      console.error(`Failed to publish to ${trigger}:`, error);
      throw error;
    }
  }

  asyncIterator<T>(trigger: string | string[]): AsyncIterator<T> {
    return this.pubSub.asyncIterator<T>(trigger);
  }

  static getPostUpdateTrigger(postId: string): string {
    return `post.update.${postId}`;
  }
}