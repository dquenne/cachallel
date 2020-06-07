import { CacheManager } from "../../src/lib/cache/CacheManager";

export class MockCacheManager<T> implements CacheManager<T> {
  private values: { [key: string]: T } = {};

  get = jest.fn(async (key: string) => {
    return this.values[key];
  });

  set = jest.fn(async (key: string, val: T) => {
    this.values[key] = val;

    return true;
  });
}
