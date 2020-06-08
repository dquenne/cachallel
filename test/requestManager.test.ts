import { MockCacheManager } from "./util/MockCacheManager";
import SimpleCacheManager from "../src/lib/cache/SimpleCacheManager";
import RequestManager from "../src/lib/requestManagement/RequestManager";
import sleep from "../src/lib/util/sleep";

describe("RequestManager", () => {
  function makeRequestMock(ms: number) {
    return jest.fn(async (val: number) => {
      await sleep(ms);
      return val * 2;
    });
  }

  it("returns the right values", async () => {
    const reqMgr = new RequestManager(
      makeRequestMock(100),
      new SimpleCacheManager(),
    );

    const results = await Promise.all([
      reqMgr.call(3),
      sleep(50).then(() => reqMgr.call(40)),
      sleep(80).then(() => reqMgr.call(3)),
    ]);

    expect(results).toEqual([6, 80, 6]);
  });

  describe("using multiple references to one promise", () => {
    it("only makes 1 external call for multiple parallel requests", async () => {
      const mock = makeRequestMock(100);
      const reqMgr = new RequestManager(mock, new SimpleCacheManager());

      await Promise.all([
        reqMgr.call(3),
        sleep(50).then(() => reqMgr.call(3)),
        sleep(80).then(() => reqMgr.call(3)),
      ]);

      expect(mock.mock.calls).toHaveLength(1);
    });

    it("clears liveRequests after cached", async () => {
      const mock = makeRequestMock(100);
      const reqMgr = new RequestManager(mock, new SimpleCacheManager());

      await Promise.all([
        reqMgr.call(3),
        sleep(50).then(() => reqMgr.call(3)),
        sleep(80).then(() => reqMgr.call(3)),
      ]);

      expect(Object.values(reqMgr.liveRequests)).toHaveLength(0);
    });
  });

  describe("using cache", () => {
    it("only makes 1 external call for multiple non-overlapping requests", async () => {
      const mock = makeRequestMock(100);
      const reqMgr = new RequestManager(mock, new SimpleCacheManager());

      await reqMgr.call(10);

      sleep(1000);

      await reqMgr.call(10);

      expect(mock.mock.calls).toHaveLength(1);
    });

    it("uses cache for non-parallel calls", async () => {
      const mock = makeRequestMock(100);
      const cacheMgr = new MockCacheManager<number>();
      const reqMgr = new RequestManager(mock, cacheMgr);

      await reqMgr.call(4);

      sleep(1000);

      await reqMgr.call(4);

      const lastCacheResult = await cacheMgr.get.mock.results[
        cacheMgr.get.mock.results.length - 1
      ].value;

      expect(lastCacheResult).toEqual(8);
    });
  });
});
