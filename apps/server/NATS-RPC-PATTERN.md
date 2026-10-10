# NATS RPC Pattern

This app uses NestJS microservices over NATS for all client→server communication.

## Wire Format

The client sends a JSON-encoded string with this envelope:

```json
{
  "id": "<uuid-v7>",
  "data": {
    "authorization": "<jwt>",
    "<field>": "<value>"
  }
}
```

NestJS NATS transport unwraps `data` and delivers it as `@Payload()`.  
The response is wrapped as `{ response: <data> }` and the client reads `.response`.

## Client Side (`createAuthorizedNatsRequest`)

```typescript
// apps/client/src/lib/utils/createNatsRequest.ts
createAuthorizedNatsRequest<ResponseType>(
  'subject.pattern',
  { field1: value1, field2: value2 },   // merged into data alongside authorization
)
```

Auto-retries once on token-expired errors after a silent token refresh.

## Server Side

```typescript
@UseGuards(AuthGuard, ...)
@MessagePattern('subject.pattern')
async handler(
  @Payload(new RpcValidationPipe()) payload: { field1: string; options?: AdminPaginateDto },
  @Ctx() context: IUserContext,           // optional, gives access to userPayload
) {
  return this.service.doSomething(payload.field1);
}
```

### RpcValidationPipe defaults

| Option | Value |
|---|---|
| `transform` | `true` |
| `whitelist` | `true` |
| `forbidNonWhitelisted` | `false` |

> **Note:** When the payload type is a plain TypeScript interface (not a class), NestJS skips `class-validator` processing entirely — the pipe acts as a pass-through. Only use DTO classes if you need actual validation.

## Pagination

Server uses `mongoose-paginate-v2`. Always convert string IDs to ObjectId explicitly:

```typescript
// Correct — explicit cast avoids paginate-v2 not auto-casting strings
{ organizationId: new Types.ObjectId(orgId) }

// Or use the helper which also handles legacy string-stored IDs:
{ ...this.organizationIdMatch(orgId) }
```

Client uses `PaginationOptions` + `withDefaults()`:

```typescript
const payload = withDefaults({ page, limit, search });
// → { page: 1, limit: 10, search: undefined, ...overrides }
```

## Error Handling

Errors thrown in handlers are caught by `ErrorHandlerInterceptor` → `handleRpcError` → re-thrown as `RpcException`.  
The client calls `isNatsErrorResponse(response)` and throws a plain `Error` with the message.
