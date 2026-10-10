# Redis usage in LMS Organization

## Overview

- **Client app (`apps/client`)**: Server actions use Redis for caching when Redis is enabled (e.g. featured courses, featured instructors, auth session cache). The client uses its own Redis client in `apps/client/src/lib/redis/client.ts` (ioredis). No Nest server module is involved.
- **Server app (`apps/server`)**: `RedisModule` is **not** registered in `app.module.ts` (it is commented out). The Nest server does not use Redis. All Redis usage is from the Next.js app (server actions running in the client app’s Node process).

## Enabling Redis for the client app

1. Set `REDIS_ENABLED=true` in the client app environment (e.g. `.env.local`).
2. Set `REDIS_URL` if needed (default: `redis://localhost:6380` for host-side apps; Docker services use `redis://redis:6379`).
3. Run a Redis instance (e.g. locally or in your deployment).

If `REDIS_ENABLED` is not `true`, the client’s Redis wrapper is a no-op (get/set/del do nothing), so the app runs without Redis and caching is effectively disabled.

## Using Redis in the Nest server (optional)

If you want the Nest server to use Redis (e.g. for server-side caching or sessions), uncomment and configure `RedisModule` in `apps/server/src/app.module.ts` and ensure the server has access to `REDIS_URL` (or equivalent) in its environment.
