import * as uuid from "uuid";
import { CacheManager } from "../cache/CacheManager";

export default class RequestManager<ResponseType, ArgumentsType extends any[]> {
  readonly liveRequests: { [uniqueRequestId: string]: Promise<ResponseType> };
  readonly requestName: string;

  constructor(
    readonly cacheManager: CacheManager<ResponseType>,
    readonly requestFunction: (...args: ArgumentsType) => Promise<ResponseType>,
    requestName?: string
  ) {
    this.liveRequests = {};
    this.requestName = requestName || uuid.v4();
  }

  async call(...args: ArgumentsType) {
    const uniqueRequestId = this.getUniqueRequestId(args);

    try {
      const cached = await this.getFromCache(uniqueRequestId);
      if (cached) {
        return cached;
      }

      const liveRequest = this.getLiveRequest(uniqueRequestId);

      if (liveRequest) {
        return await liveRequest;
      }
    } catch {}

    return await this.makeNewRequest(uniqueRequestId, args);
  }

  getUniqueRequestId(args: ArgumentsType) {
    return JSON.stringify([this.requestName, ...args]);
  }

  // new request management

  async makeNewRequest(uniqueRequestId: string, args: ArgumentsType) {
    const requestPromise = this.requestFunction(...args);

    this.setLiveRequest(uniqueRequestId, requestPromise);

    const result = await requestPromise;

    await this.cacheManager.set(uniqueRequestId, result);

    this.clearLiveRequest(uniqueRequestId);

    return result;
  }

  // cache management

  async getFromCache(key: string) {
    return await this.cacheManager.get(key);
  }

  // live request management

  setLiveRequest(
    uniqueRequestId: string,
    promise: Promise<ResponseType>
  ): void {
    this.liveRequests[uniqueRequestId] = promise;
  }

  getLiveRequest(uniqueRequestId: string): Promise<ResponseType> | undefined {
    return this.liveRequests[uniqueRequestId];
  }

  clearLiveRequest(uniqueRequestId: string) {
    return delete this.liveRequests[uniqueRequestId];
  }
}
