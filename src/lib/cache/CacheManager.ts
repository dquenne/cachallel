export interface CacheManager<ValueType = string> {
  get(key: string): Promise<ValueType | undefined>;
  set(key: string, value: ValueType): Promise<boolean>;
}
