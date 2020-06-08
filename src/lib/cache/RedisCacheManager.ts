import { RedisClient } from "redis";
import { CacheManager } from "./CacheManager";

export default class RedisCacheManager<T> implements CacheManager<T> {
  constructor(
    readonly redis: RedisClient,
    readonly serialize = (val: T) => JSON.stringify(val),
    readonly deserialize = (serialized: string) => JSON.parse(serialized) as T,
  ) {}

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
      this.redis.set(key, this.serialize(val), (err, val) => {
        if (err) {
          reject(err);
        }
        resolve(true);
      }),
    );
  }
}
