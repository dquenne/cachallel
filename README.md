# Cachallel

Wrapper for managing high volume of duplicate idempotent asynchronous requests
in JavaScript & TypeScript.

## With basic caching

When you have a high volume of duplicate, overlapping, idempotent requests. If
your application is making a number of requests with the same inputs, and the
requests are idempotent, caching can be helpful to avoid unnecessary
computation. If these requests are long-running and many duplicate requests are
made before a response is cached for that request, there can be a lot of wasted
computation.

Here is an example timeline only using caching. Requests 1, 2, 3, and 4 all
have the same input and will receive the same output.

```
time
request 1
  -> cache miss
  -> make call to external service
    |
    | request 2
    |   -> cache miss
    |   -> make call to external service
    |     |
    |     | request 2
    |     |   -> cache miss
    |     |   -> make call to external service
    |     |     |
    |     |     |
    |     |     |
     -> request 1 resolved, update cache
          |     |
          |     | request 4
          |     |   -> use cached response from request 1
          |     |
           -> request 2 resolved, update cache
                |
                |
                 -> request 3 resolved, update cache
```

When requests 2 and 3 are made, request has not finished, so the cache will not
be populated. There are two unfortuante outcomes of this approach:

1. Requests 2 and 3 will waste resources by performing the same expensive and
   long-running request 1 is triggering.
1. When request 1 is fulfilled, there is enough information to fulfill requests
   2 and 3, but instead requests 2 and 3 will not resolve until they get a
   response from the external service.

## With Cachallel

Cachallel optimizes for overlapping, duplicate requests by letting subsequent
requests latch onto an existing Promise from a previous request.

```
request 1
  -> cache miss
  -> no pending Promise for this input
  -> make call to external service
    |
    | request 2
    |   -> cache miss
    | <--- attach to request 1's Promise
    |
    | request 3
    |   -> cache miss
    | <--- attach to request 1's Promise
    |
    |
    |
     -> request 1 resolved
       -> update cache
       -> request 2 resolved
       -> request 3 resolved

request 4
  -> use cached response from request 1
```

## Example usage

```ts
import axios from "axios";
import { RedisClient } from "redis";
import { RequestManager, RedisCacheManager } from "cachallel";

async function getResourceFromSlowApi(
  id: number,
): Promise<{ id: number; name: string }> {
  return await axios.get(`external.service/resource/${id}`);
}

const redisClient = new RedisClient({ host: "127.0.0.1" });

const slowApiManager = new RequestManager(
  getResourceFromSlowApi,
  new RedisCacheManager(redisClient),
);

export default async function call(id: number) {
  return await slowApiManager.call(id);
}
```
