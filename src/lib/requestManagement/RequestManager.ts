import * as uuid from "uuid";
import { CacheManager } from "../cache/CacheManager";

type RequestCallback<T> = (data: { requestId: string; args: T }) => {};

interface Options<ArgType> {
  onCacheHit?: RequestCallback<ArgType>;
  onLiveRequestHit?: RequestCallback<ArgType>;
  onCacheAndLiveRequestMiss?: RequestCallback<ArgType>;
}

export default class RequestManager<ResponseType, ArgumentsType extends any[]> {
  readonly liveRequests: { [requestId: string]: Promise<ResponseType> };
  readonly requestName: string;

  constructor(
    readonly requestFunction: (...args: ArgumentsType) => Promise<ResponseType>,
    readonly cacheManager: CacheManager<ResponseType>,
    readonly options: Options<ArgumentsType> = {},
  ) {
    this.liveRequests = {};
    this.requestName = uuid.v4();
  }

  async call(...args: ArgumentsType) {
    const requestId = this.getRequestId(args);

    try {
      const cached = await this.cacheManager.get(requestId);
      if (cached) {
        if (this.options.onCacheHit) {
          this.options.onCacheHit({ requestId, args });
        }
        return cached;
      }

      const liveRequest = this.getLiveRequest(requestId);

      if (liveRequest) {
        if (this.options.onLiveRequestHit) {
          this.options.onLiveRequestHit({ requestId, args });
        }
        return await liveRequest;
      }
    } catch {}

    if (this.options.onCacheAndLiveRequestMiss) {
      this.options.onCacheAndLiveRequestMiss({ requestId, args });
    }

    return await this.makeNewRequest(requestId, args);
  }

  private getRequestId(args: ArgumentsType) {
    return JSON.stringify([this.requestName, ...args]);
  }

  // new request management

  private async makeNewRequest(requestId: string, args: ArgumentsType) {
    const requestPromise = this.requestFunction(...args);

    this.setLiveRequest(requestId, requestPromise);

    const result = await requestPromise;

    await this.cacheManager.set(requestId, result);

    this.clearLiveRequest(requestId);

    return result;
  }

  // live request management

  private setLiveRequest(
    requestId: string,
    promise: Promise<ResponseType>,
  ): void {
    this.liveRequests[requestId] = promise;
  }

  private getLiveRequest(requestId: string): Promise<ResponseType> | undefined {
    return this.liveRequests[requestId];
  }

  private clearLiveRequest(requestId: string) {
    return delete this.liveRequests[requestId];
  }
}
