import { RedisClient, Callback } from "redis";
import { CacheManager } from "./CacheManager";

export default class RedisCacheManager<T> implements CacheManager<T> {
  serialize: (val: T) => string;
  deserialize: (serialized: string) => T;
  ttlSeconds: number | undefined;

  constructor(
    readonly redis: RedisClient,
    options?: {
      ttlSeconds?: number;
      serialize?: (val: T) => string;
      deserialize?: (serialized: string) => T;
    },
  ) {
    const defaultOptions = {
      ttlSeconds: undefined,
      serialize: (val: T) => JSON.stringify(val),
      deserialize: (serialized: string) => JSON.parse(serialized) as T,
    };

    const mergedOptions = { ...defaultOptions, ...options };

    this.serialize = mergedOptions.serialize;
    this.deserialize = mergedOptions.deserialize;
    this.ttlSeconds = mergedOptions.ttlSeconds;
  }

  get(key: string) {
    return new Promise<T>((resolve, reject) =>
      this.redis.get(key, (err, val: string | null) => {
        if (err) {
          reject(err);
        }
        resolve(val ? this.deserialize(val) : undefined);
      }),
    );
  }

  set(key: string, val: T) {
    return new Promise<boolean>((resolve, reject) =>
      this.setWithOrWithoutTtl(key, this.serialize(val), (err, val) => {
        if (err) {
          reject(err);
        }
        resolve(true);
      }),
    );
  }

  private setWithOrWithoutTtl(
    key: string,
    val: string,
    callback: Callback<string>,
  ) {
    this.ttlSeconds
      ? this.redis.setex(key, this.ttlSeconds, val, callback)
      : this.redis.set(key, val, callback);
  }
}
