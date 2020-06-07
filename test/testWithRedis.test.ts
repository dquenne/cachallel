import { RedisClient } from "redis";

import RedisCacheManager from "../src/lib/cache/RedisCacheManager";
import RequestManager from "../src/lib/requestManagement/RequestManager";
import sleep from "../src/lib/util/sleep";

describe("RequestManager - using Redis", () => {
  let redisClient: RedisClient;

  beforeAll(async () => {
    redisClient = new RedisClient({ host: "127.0.0.1", port: 6379 });
  });

  afterAll(async () => {
    await new Promise((resolve) => redisClient.quit(resolve));
  });

  function makeRequestMock(ms: number) {
    return jest.fn(async (val: number) => {
      await sleep(ms);
      return val * 2;
    });
  }

  it("smoke test", async () => {
    const reqMgr = new RequestManager(
      new RedisCacheManager(redisClient),
      makeRequestMock(100)
    );

    const results = await Promise.all([
      reqMgr.call(3),
      sleep(10).then(() => reqMgr.call(4)),
      sleep(20).then(() => reqMgr.call(3)),
    ]);

    expect(results).toEqual([6, 8, 6]);
  });

  it("uses cache for non-parallel calls", async () => {
    const mock = makeRequestMock(100);
    const cacheMgr = new RedisCacheManager(redisClient);

    const reqMgr = new RequestManager(cacheMgr, mock);

    await reqMgr.call(4);

    sleep(1000);

    await reqMgr.call(4);
  });
});
