import { CacheManager } from "./CacheManager";

export default class SimpleCacheManager<T> implements CacheManager<T> {
  private values: { [key: string]: T } = {};

  async get(key: string) {
    return this.values[key];
  }

  async set(key: string, val: T) {
    this.values[key] = val;

    return true;
  }
}
