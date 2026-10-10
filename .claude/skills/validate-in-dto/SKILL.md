---
name: validate-in-dto
description: >-
  Enforces this repo's rule that request validation lives in DTOs, never in services. Use whenever
  adding or modifying any input validation in the NestJS server (apps/server) — required fields,
  format/type checks, ranges, enums, cross-field rules like "from ≤ to" or "max one year". Trigger
  before writing any `if (!x) throw new BadRequestException(...)`, `Number.isNaN(...)`, manual date
  parsing, or other input-shape checks inside a service or controller body. Also use when reviewing
  a NestJS handler/service, creating a new endpoint (HTTP `@Body()`/`@Query()` or NATS
  `@MessagePattern` `@Payload()`), or wiring a class-validator decorator or custom validator.
---

# Validate in the DTO, not the service

In this codebase, **a service trusts its inputs**. By the time a payload reaches a service method it
must already be the right shape — required fields present, dates parseable, numbers in range,
cross-field rules satisfied. That guarantee comes from the **DTO + a validation pipe at the
controller boundary**, not from defensive checks scattered through service code.

## Why this matters

- **One place to look.** The contract for an endpoint is its DTO. A reviewer reads the DTO and knows
  exactly what's accepted — they don't have to trace through service logic hunting for `throw`s.
- **Consistent errors.** The pipes (`ValidationPipe` for HTTP, `RpcValidationPipe` for NATS) produce
  uniform, formatted validation errors. Hand-rolled `BadRequestException`s in services drift in
  wording and structure.
- **Services stay about behavior.** Mixing "is this input valid?" with "what do we do with it?"
  makes services longer and muddies their real job. Validated-by-construction inputs keep them lean.
- **Reuse.** A `@IsMongoId()` or a custom `@IsWithinOneYearOf('from')` is declared once and reused
  across every endpoint that needs it.

## How validation is wired here

- **HTTP handlers** — the global `ValidationPipe` (`transform: true, whitelist: true`) is registered
  in `apps/server/src/main.ts`. Type a `@Body()` or `@Query()` parameter as a DTO class and it is
  validated and transformed automatically. (`@Query()` strings become numbers/Dates via
  `class-transformer`, so use `@Type(() => Number)` on numeric fields.)
- **NATS message handlers** — the global pipe does **not** apply to microservice handlers (the
  microservice is connected without `inheritAppConfig`). Validate explicitly per handler:
  `@Payload(new RpcValidationPipe()) payload: SomeDto` (from `src/utils/RpcValidationPipe`). This is
  the established pattern across the server (see the `ai`, `category`, `agora`, `ai-plan` message
  controllers). `whitelist: true` strips extras like the injected `authorization` field, and guards
  run before the pipe, so the `AuthGuard` still sees the raw token.

## What goes where

- **Single-field rules** → standard class-validator decorators on the DTO property:
  `@IsNotEmpty()`, `@IsMongoId()`, `@IsDateString()`, `@IsEnum(...)`, `@IsInt()`, `@Min()`, `@Max()`,
  `@IsOptional()`, plus `@Type(() => Number)` for query/numeric coercion.
- **Cross-field rules** (one field validated against another — "from ≤ to", "≤ one year apart",
  "must be empty when role is X") → a **custom validator** built with `registerDecorator`, applied to
  the dependent property. Read the sibling via `args.object`. Examples in the repo:
  `apps/server/src/utils/validators/is-within-one-year-of.validator.ts` and
  `lib/shared-types/src/lib/dto/custom/must-be-empty.validator.ts`.
- **Defaults** → set on the DTO property (`page?: number = 1`). The service can still clamp for
  safety, but the DTO carries the intended default.
- **Normalization that isn't validation** (e.g. `date.setHours(0,0,0,0)` to build inclusive query
  bounds, converting an id string to `ObjectId`) is fine in the service — that's preparing a query,
  not deciding whether the input is acceptable.

## Canonical example

`apps/server/src/attendance/dto/get-student-course-history.dto.ts` — required `courseId`/`from`/`to`,
optional paginated `page`/`limit`, and a cross-field `@IsWithinOneYearOf('from')` on `to`:

```ts
export class GetStudentCourseHistoryDto {
  @IsNotEmpty() @IsMongoId() courseId: string;
  @IsNotEmpty() @IsDateString() from: string;
  @IsNotEmpty() @IsDateString() @IsWithinOneYearOf('from') to: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number = 15;
}
```

Handlers stay thin and the service trusts the input:

```ts
// HTTP
@Get('student/me/history')
getMyCourseHistory(@CurrentUser() user: UserDocument, @Query() query: GetStudentCourseHistoryDto) {
  return this.attendanceService.getStudentCourseHistory(user._id.toString(), query.courseId, query);
}

// NATS
@MessagePattern('attendance.getStudentCourseHistory')
getStudentCourseHistory(@Payload(new RpcValidationPipe()) payload: GetStudentCourseHistoryDto, @Ctx() ctx: IUserContext) {
  return this.attendanceService.getStudentCourseHistory(ctx.userPayload._id.toString(), payload.courseId, payload);
}
```

## Anti-pattern (don't do this)

```ts
// ❌ validation living in the service
async getStudentCourseHistory(studentId, courseId, query) {
  if (!query.from || !query.to) throw new BadRequestException('Both from and to are required');
  const from = new Date(query.from);
  if (Number.isNaN(from.getTime())) throw new BadRequestException('Invalid date');
  const maxTo = new Date(from); maxTo.setFullYear(maxTo.getFullYear() + 1);
  if (new Date(query.to) > maxTo) throw new BadRequestException('Range too long');
  // ...
}
```

If you catch yourself writing required/format/range/cross-field checks in a service or controller
body, stop and move them to the DTO — add a class-validator decorator, or a custom `registerDecorator`
validator for cross-field rules, and make sure the boundary runs the right pipe.
