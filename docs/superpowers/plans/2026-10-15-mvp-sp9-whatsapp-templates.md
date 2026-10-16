# WhatsApp Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Staff create reusable WhatsApp message templates with `{{variable}}` placeholders. From a group's student row or the group header, they pick a template, preview it filled in for that student or group, then copy the text or open a `wa.me` deep-link in WhatsApp.

**Architecture:** A new NestJS module `message-template` in `apps/server/src/message-template/`. Pure `renderTemplate(body, values)` function does variable substitution with no HTML evaluation. Rendering endpoint resolves live values from Group, Level, Course, Session and User collections. NATS message patterns under `messageTemplates.*` expose CRUD and render to client React Query hooks and Next.js Server Actions.

**Tech Stack:** NestJS 11, Mongoose 8, Luxon 3.7.2, Jest 29 (server), Next.js 16, next-intl, @tanstack/react-query, Vitest 2 + Testing Library (client and shared-types), pnpm + Nx monorepo.

**Spec:** `docs/superpowers/specs/2026-10-12-mvp-sp9-whatsapp-templates-design.md`

**Depends on:** Sub-project 1 (Level, Group, GroupStudent, User).

## Global Constraints

- **ONE heavy node process at a time.** Always `jest --runInBand` and `vitest --no-file-parallelism`. Never `nx run-many`.
- **Never run `pnpm seed`** — it calls `deleteMany` on every collection. Role changes go through `pnpm --filter server seed:prod`.
- **`eslint --fix` only on specific new or modified files, never on a directory.**
- Server controllers are NATS message handlers (`@MessagePattern`). No HTTP controllers.
- Every server-side error is a key from `MessageTemplateErrors`; the client translates it with `translateApiMessage`.
- Every user-facing string is a next-intl key present in **both** `apps/client/messages/en.json` and `apps/client/messages/ar.json`. `pnpm --filter client i18n:check-keys` must pass.
- **Permission Subject:** `Subjects.MESSAGE_TEMPLATE`. OWNER, MANAGER, COORDINATOR get `MANAGE`; no other roles.

## Review Focus

- A GROUP-context template with a STUDENT-only variable (`studentName`, `parentName`) must be rejected at save time, not silently rendered as empty.
- A template body with `{{ x }}` (spaces inside braces) must not be treated as a valid variable — it renders as literal text.
- `wa.me` phone normalization: a phone like `+20 123 456 7890` must become `+20123456789` (digits only, keep leading `+`).
- Rendering a template for a student not enrolled in the specified group must return 403, not 404.
- Re-evaluating the same group's render after a field is added (e.g., meeting link) must update `missingVariables` without a template save.

---

## File Structure

**Shared types** (`lib/shared-types/src/lib/`):
- `types/message-template/message-template.types.ts` — `TemplateContext`, `IMessageTemplate`, `RenderTemplateResult`, DTOs.
- `messages/message-template-errors.enum.ts` — `MessageTemplateErrors`.
- `types/role/subject/subjects.enum.ts` — add `Subjects.MESSAGE_TEMPLATE`.

**Server** (`apps/server/src/message-template/`):
- `domain/template-render.ts` — pure `renderTemplate(body, values)`, `extractVariables(body)`, `validateVariables(context, body)`.
- `domain/template-render.spec.ts`
- `entities/message-template.entity.ts` — Mongoose schema with soft delete.
- `entities/message-template.entity.spec.ts`
- `dto/message-template.dto.ts`
- `services/message-template.service.ts` — CRUD with variable validation.
- `services/message-template.service.spec.ts`
- `services/template-render.service.ts` — resolves live values and calls `renderTemplate`.
- `services/template-render.service.spec.ts`
- `message-template.controller.message.ts`
- `message-template.controller.message.spec.ts`
- `message-template.module.ts`
- Updates to `apps/server/src/app.module.ts`
- Updates to `apps/server/src/role/seeds/` (OWNER, MANAGER, COORDINATOR)
- Updates to `apps/server/src/role/seeds/roles.config.spec.ts`

**Client**:
- `apps/client/src/lib/types/message-template/message-template.ts`
- `apps/client/src/lib/actions/message-template/message-template.action.ts`
- `apps/client/src/lib/actions/message-template/message-template.action.spec.ts`
- `apps/client/src/lib/hooks/message-template/use-message-template.hook.ts`
- `apps/client/src/lib/hooks/message-template/use-message-template.hook.spec.ts`
- `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/message-templates/page.tsx`
- `apps/client/src/components/organs/message-template/template-editor.tsx`
- `apps/client/src/components/organs/message-template/template-send-dialog.tsx`
- `apps/client/src/components/organs/message-template/template-components.spec.tsx`
- Updates to `apps/client/messages/en.json` and `apps/client/messages/ar.json`
- Updates to `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/academics/groups/[id]/__components/group-formation-screen.tsx`

---

## Task Breakdown

### Task 1: Shared types, error keys and subject

**Files:**
- Create: `lib/shared-types/src/lib/types/message-template/message-template.types.ts`
- Create: `lib/shared-types/src/lib/types/message-template/index.ts`
- Create: `lib/shared-types/src/lib/messages/message-template-errors.enum.ts`
- Modify: `lib/shared-types/src/lib/types/role/subject/subjects.enum.ts`
- Modify: `lib/shared-types/src/lib/messages/index.ts`
- Modify: `lib/shared-types/src/lib/types/index.ts`
- Create: `lib/shared-types/src/lib/types/message-template/message-template.types.spec.ts`

**Interfaces:**
- Produces:
  - `TemplateContext = 'STUDENT' | 'GROUP'`
  - `ALLOWED_VARIABLES: Record<TemplateContext, readonly string[]>` — GROUP: `['groupName','courseName','levelName','teacherName','startDate','schedule','meetingLink','whatsappGroupLink']`; STUDENT adds `['studentName','parentName']`.
  - `IMessageTemplate { _id, organizationId, name, context: TemplateContext, body, createdBy, updatedAt, deletedAt? }`
  - `RenderTemplateResult { text: string, missingVariables: string[], phone?: string, waLink?: string }`
  - `CreateMessageTemplateDto { name, context, body }`
  - `UpdateMessageTemplateDto { name?, body? }`
  - `RenderMessageTemplateDto { groupId: string, studentId?: string }`
  - `MessageTemplateErrors.TEMPLATE_NOT_FOUND`, `UNKNOWN_TEMPLATE_VARIABLE`, `STUDENT_NOT_IN_GROUP`, `TEMPLATE_NAME_TAKEN`
  - `Subjects.MESSAGE_TEMPLATE = 'MESSAGE_TEMPLATE'`

- [ ] **Step 1: Write failing test**

```typescript
// lib/shared-types/src/lib/types/message-template/message-template.types.spec.ts
import { ALLOWED_VARIABLES, MessageTemplateErrors, Subjects, TemplateContext } from '@darnozom/shared-types';

describe('TemplateContext', () => {
  it('has STUDENT and GROUP values', () => {
    const values: TemplateContext[] = ['STUDENT', 'GROUP'];
    expect(values).toHaveLength(2);
  });
});

describe('ALLOWED_VARIABLES', () => {
  it('GROUP variables do not include studentName or parentName', () => {
    expect(ALLOWED_VARIABLES.GROUP).not.toContain('studentName');
    expect(ALLOWED_VARIABLES.GROUP).not.toContain('parentName');
  });
  it('STUDENT variables include all GROUP variables plus studentName and parentName', () => {
    expect(ALLOWED_VARIABLES.STUDENT).toContain('studentName');
    expect(ALLOWED_VARIABLES.STUDENT).toContain('parentName');
    for (const v of ALLOWED_VARIABLES.GROUP) {
      expect(ALLOWED_VARIABLES.STUDENT).toContain(v);
    }
  });
});

describe('MessageTemplateErrors', () => {
  it('has required error keys', () => {
    expect(MessageTemplateErrors.TEMPLATE_NOT_FOUND).toBeDefined();
    expect(MessageTemplateErrors.UNKNOWN_TEMPLATE_VARIABLE).toBeDefined();
    expect(MessageTemplateErrors.STUDENT_NOT_IN_GROUP).toBeDefined();
    expect(MessageTemplateErrors.TEMPLATE_NAME_TAKEN).toBeDefined();
  });
});

describe('Subjects', () => {
  it('has MESSAGE_TEMPLATE subject', () => {
    expect(Subjects.MESSAGE_TEMPLATE).toBe('MESSAGE_TEMPLATE');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @darnozom/shared-types test:run -- message-template.types`
Expected: FAIL — `ALLOWED_VARIABLES` not found

- [ ] **Step 3: Implement**

```typescript
// lib/shared-types/src/lib/types/message-template/message-template.types.ts
export type TemplateContext = 'STUDENT' | 'GROUP';

const GROUP_VARIABLES = ['groupName','courseName','levelName','teacherName','startDate','schedule','meetingLink','whatsappGroupLink'] as const;
const STUDENT_VARIABLES = [...GROUP_VARIABLES, 'studentName', 'parentName'] as const;

export const ALLOWED_VARIABLES: Record<TemplateContext, readonly string[]> = {
  GROUP: GROUP_VARIABLES,
  STUDENT: STUDENT_VARIABLES,
};

export interface IMessageTemplate {
  _id: string;
  organizationId: string;
  name: string;
  context: TemplateContext;
  body: string;
  createdBy: string | null;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface RenderTemplateResult {
  text: string;
  missingVariables: string[];
  phone?: string;
  waLink?: string;
}

export interface CreateMessageTemplateDto {
  name: string;
  context: TemplateContext;
  body: string;
}

export interface UpdateMessageTemplateDto {
  name?: string;
  body?: string;
}

export interface RenderMessageTemplateDto {
  groupId: string;
  studentId?: string;
}
```

```typescript
// lib/shared-types/src/lib/messages/message-template-errors.enum.ts
export enum MessageTemplateErrors {
  TEMPLATE_NOT_FOUND = 'message-template/not-found',
  UNKNOWN_TEMPLATE_VARIABLE = 'message-template/unknown-variable',
  STUDENT_NOT_IN_GROUP = 'message-template/student-not-in-group',
  TEMPLATE_NAME_TAKEN = 'message-template/name-taken',
}
```

Add to `subjects.enum.ts`:
```typescript
MESSAGE_TEMPLATE = 'MESSAGE_TEMPLATE',
```

Add exports to `lib/shared-types/src/lib/messages/index.ts`:
```typescript
export * from './message-template-errors.enum';
```

Add to `lib/shared-types/src/lib/types/index.ts`:
```typescript
export * from './message-template';
```

Create `lib/shared-types/src/lib/types/message-template/index.ts`:
```typescript
export * from './message-template.types';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @darnozom/shared-types test:run -- message-template.types`
Expected: PASS 4/4

- [ ] **Step 5: Commit**

```bash
git add lib/shared-types/src/lib/types/message-template/ lib/shared-types/src/lib/messages/message-template-errors.enum.ts lib/shared-types/src/lib/types/role/subject/subjects.enum.ts lib/shared-types/src/lib/messages/index.ts lib/shared-types/src/lib/types/index.ts
git commit -m "feat(sp9): add WhatsApp template shared types, error keys and subject"
```

---

### Task 2: Pure template rendering engine

**Files:**
- Create: `apps/server/src/message-template/domain/template-render.ts`
- Create: `apps/server/src/message-template/domain/template-render.spec.ts`

**Interfaces:**
- Consumes: `ALLOWED_VARIABLES`, `TemplateContext` from Task 1.
- Produces:
  - `extractVariables(body: string): string[]` — returns unique variable names found in `{{name}}` patterns (no spaces inside braces).
  - `validateVariables(context: TemplateContext, body: string): string[]` — returns array of unknown variable names; empty = valid.
  - `renderTemplate(body: string, values: Record<string, string | undefined>): { text: string; missingVariables: string[] }` — substitutes `{{name}}` with value or `''`; lists variables with no/undefined value in `missingVariables`.
  - `normalizePhone(raw: string): string` — strips all non-digit chars except leading `+`.

- [ ] **Step 1: Write failing tests**

```typescript
// apps/server/src/message-template/domain/template-render.spec.ts
import { extractVariables, validateVariables, renderTemplate, normalizePhone } from './template-render';

describe('extractVariables', () => {
  it('extracts variable names from {{name}} syntax', () => {
    expect(extractVariables('Hello {{studentName}}, your group is {{groupName}}')).toEqual(['studentName', 'groupName']);
  });
  it('ignores {{ x }} with spaces inside braces', () => {
    expect(extractVariables('{{ invalid }} {{valid}}')).toEqual(['valid']);
  });
  it('returns empty array for no variables', () => {
    expect(extractVariables('Hello world')).toEqual([]);
  });
  it('deduplicates repeated variables', () => {
    expect(extractVariables('{{name}} and {{name}}')).toEqual(['name']);
  });
});

describe('validateVariables', () => {
  it('returns empty array for all known GROUP variables', () => {
    expect(validateVariables('GROUP', 'Join {{groupName}} starting {{startDate}}')).toEqual([]);
  });
  it('returns unknown variables for GROUP context using STUDENT-only variable', () => {
    expect(validateVariables('GROUP', '{{studentName}} joins {{groupName}}')).toContain('studentName');
  });
  it('returns empty array for STUDENT context using any allowed variable', () => {
    expect(validateVariables('STUDENT', '{{studentName}} in {{groupName}}')).toEqual([]);
  });
  it('returns truly unknown variable names', () => {
    expect(validateVariables('STUDENT', '{{unknownVar}}')).toEqual(['unknownVar']);
  });
});

describe('renderTemplate', () => {
  it('substitutes variables with provided values', () => {
    const { text } = renderTemplate('Hello {{studentName}}', { studentName: 'Ahmed' });
    expect(text).toBe('Hello Ahmed');
  });
  it('replaces missing variable with empty string and lists it', () => {
    const { text, missingVariables } = renderTemplate('Link: {{meetingLink}}', {});
    expect(text).toBe('Link: ');
    expect(missingVariables).toContain('meetingLink');
  });
  it('does not report a variable as missing if it has a value', () => {
    const { missingVariables } = renderTemplate('{{groupName}}', { groupName: 'Math 101' });
    expect(missingVariables).toHaveLength(0);
  });
  it('does not substitute {{ x }} with spaces', () => {
    const { text } = renderTemplate('{{ invalid }}', { invalid: 'oops' });
    expect(text).toBe('{{ invalid }}');
  });
});

describe('normalizePhone', () => {
  it('strips spaces and dashes', () => {
    expect(normalizePhone('+20 123 456-789')).toBe('+20123456789');
  });
  it('keeps leading plus', () => {
    expect(normalizePhone('+201234567890')).toBe('+201234567890');
  });
  it('strips all non-digit chars except leading plus', () => {
    expect(normalizePhone('(020) 123.456')).toBe('020123456');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter server exec jest template-render --runInBand`
Expected: FAIL — `template-render` module not found

- [ ] **Step 3: Implement**

```typescript
// apps/server/src/message-template/domain/template-render.ts
import { ALLOWED_VARIABLES, TemplateContext } from '@darnozom/shared-types';

const VARIABLE_RE = /\{\{([a-zA-Z][a-zA-Z0-9]*)\}\}/g;

export function extractVariables(body: string): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  for (const [, name] of body.matchAll(VARIABLE_RE)) {
    if (!seen.has(name)) { seen.add(name); found.push(name); }
  }
  return found;
}

export function validateVariables(context: TemplateContext, body: string): string[] {
  const allowed = new Set(ALLOWED_VARIABLES[context]);
  return extractVariables(body).filter((v) => !allowed.has(v));
}

export function renderTemplate(
  body: string,
  values: Record<string, string | undefined>,
): { text: string; missingVariables: string[] } {
  const missingVariables: string[] = [];
  const text = body.replace(VARIABLE_RE, (_, name) => {
    const val = values[name];
    if (val === undefined || val === null || val === '') {
      missingVariables.push(name);
      return '';
    }
    return val;
  });
  return { text, missingVariables };
}

export function normalizePhone(raw: string): string {
  const hasLeadingPlus = raw.trimStart().startsWith('+');
  const digits = raw.replace(/[^\d]/g, '');
  return hasLeadingPlus ? `+${digits}` : digits;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter server exec jest template-render --runInBand`
Expected: PASS 12/12

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/message-template/domain/
git commit -m "feat(sp9): add pure template rendering and phone normalization engine"
```

---

### Task 3: MessageTemplate entity

**Files:**
- Create: `apps/server/src/message-template/entities/message-template.entity.ts`
- Create: `apps/server/src/message-template/entities/message-template.entity.spec.ts`

**Interfaces:**
- Consumes: `TemplateContext` from Task 1.
- Produces: `MessageTemplate` Mongoose document class, `MessageTemplateSchema`, `MessageTemplate.name = 'MessageTemplate'`.

- [ ] **Step 1: Write failing test**

```typescript
// apps/server/src/message-template/entities/message-template.entity.spec.ts
import { MessageTemplate, MessageTemplateSchema } from './message-template.entity';

describe('MessageTemplate schema', () => {
  it('has expected fields defined', () => {
    const paths = MessageTemplateSchema.paths;
    expect(paths).toHaveProperty('organizationId');
    expect(paths).toHaveProperty('name');
    expect(paths).toHaveProperty('context');
    expect(paths).toHaveProperty('body');
    expect(paths).toHaveProperty('createdBy');
    expect(paths).toHaveProperty('deletedAt');
  });

  it('body has maxlength 2000', () => {
    const bodyPath = MessageTemplateSchema.path('body') as any;
    expect(bodyPath.options.maxlength).toBe(2000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter server exec jest message-template.entity --runInBand`
Expected: FAIL — module not found

- [ ] **Step 3: Implement**

```typescript
// apps/server/src/message-template/entities/message-template.entity.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { TemplateContext } from '@darnozom/shared-types';
import { applySoftDeleteMiddleware } from 'src/utils/soft-delete';

@Schema({ timestamps: true })
export class MessageTemplate extends Document {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({ type: String, enum: ['STUDENT', 'GROUP'] as TemplateContext[], required: true })
  context: TemplateContext;

  @Prop({ type: String, required: true, maxlength: 2000 })
  body: string;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  createdBy: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;
}

export const MessageTemplateSchema = SchemaFactory.createForClass(MessageTemplate);
MessageTemplateSchema.index({ organizationId: 1, name: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });
applySoftDeleteMiddleware(MessageTemplateSchema);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter server exec jest message-template.entity --runInBand`
Expected: PASS 2/2

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/message-template/entities/
git commit -m "feat(sp9): add MessageTemplate Mongoose schema with soft delete"
```

---

### Task 4: MessageTemplate CRUD service

**Files:**
- Create: `apps/server/src/message-template/dto/message-template.dto.ts`
- Create: `apps/server/src/message-template/services/message-template.service.ts`
- Create: `apps/server/src/message-template/services/message-template.service.spec.ts`

**Interfaces:**
- Consumes: `MessageTemplate` entity (Task 3), `validateVariables`, `extractVariables` (Task 2), `MessageTemplateErrors`, `CreateMessageTemplateDto`, `UpdateMessageTemplateDto` (Task 1).
- Produces: `MessageTemplateService` with `create`, `findAll`, `findOne`, `update`, `remove`.

- [ ] **Step 1: Write failing tests**

```typescript
// apps/server/src/message-template/services/message-template.service.spec.ts
import { ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { MessageTemplateService } from './message-template.service';
import { MessageTemplateErrors } from '@darnozom/shared-types';

const ORG = new Types.ObjectId();
const USER = new Types.ObjectId();

const makeService = (overrides: Partial<{
  findOne: jest.Mock; find: jest.Mock; create: jest.Mock; findOneAndUpdate: jest.Mock;
}> = {}) => {
  const saved: Record<string, unknown>[] = [];
  const model = {
    findOne: jest.fn(async (q: Record<string, unknown>) =>
      saved.find((t: any) => t.name === (q as any).name && t.deletedAt == null) ?? null
    ),
    find: jest.fn(async () => saved.filter((t: any) => t.deletedAt == null)),
    create: jest.fn(async (doc: Record<string, unknown>) => {
      const t = { ...doc, _id: new Types.ObjectId() };
      saved.push(t);
      return t;
    }),
    findOneAndUpdate: jest.fn(async () => null),
    ...overrides,
  };
  return { service: new MessageTemplateService(model as any), model, saved };
};

describe('MessageTemplateService.create', () => {
  it('creates a template with valid GROUP variables', async () => {
    const { service } = makeService();
    const result = await service.create(String(ORG), String(USER), {
      name: 'Welcome', context: 'GROUP', body: 'Hello {{groupName}}',
    });
    expect(result).toMatchObject({ name: 'Welcome', context: 'GROUP' });
  });

  it('rejects unknown variables', async () => {
    const { service } = makeService();
    await expect(
      service.create(String(ORG), String(USER), {
        name: 'Bad', context: 'GROUP', body: '{{unknownVar}}',
      })
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects STUDENT-only variable in GROUP context', async () => {
    const { service } = makeService();
    await expect(
      service.create(String(ORG), String(USER), {
        name: 'Bad2', context: 'GROUP', body: '{{studentName}}',
      })
    ).rejects.toThrow(BadRequestException);
  });

  it('throws ConflictException when name is already taken in org', async () => {
    const existing = { name: 'Dupe', organizationId: ORG, deletedAt: null };
    const { service } = makeService({ findOne: jest.fn(async () => existing) });
    await expect(
      service.create(String(ORG), String(USER), {
        name: 'Dupe', context: 'STUDENT', body: '{{studentName}}',
      })
    ).rejects.toThrow(ConflictException);
  });
});

describe('MessageTemplateService.remove', () => {
  it('soft-deletes an existing template', async () => {
    const template = { _id: new Types.ObjectId(), organizationId: ORG, deletedAt: null, save: jest.fn(async function(this: any) { return this; }) };
    const findOneMock = jest.fn(async () => template);
    const { service } = makeService({ findOne: findOneMock });
    await service.remove(String(ORG), String(template._id));
    expect(template.save).toHaveBeenCalled();
    expect(template.deletedAt).toBeInstanceOf(Date);
  });

  it('throws NotFoundException when template does not exist', async () => {
    const { service } = makeService({ findOne: jest.fn(async () => null) });
    await expect(service.remove(String(ORG), String(new Types.ObjectId()))).rejects.toThrow(NotFoundException);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter server exec jest message-template.service --runInBand`
Expected: FAIL — `MessageTemplateService` not found

- [ ] **Step 3: Implement DTOs**

```typescript
// apps/server/src/message-template/dto/message-template.dto.ts
import { IsEnum, IsMongoId, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { TemplateContext } from '@darnozom/shared-types';

export class CreateMessageTemplateDtoServer {
  @IsString() @MinLength(1) @MaxLength(100) name: string;
  @IsEnum(['STUDENT', 'GROUP'] as TemplateContext[]) context: TemplateContext;
  @IsString() @MinLength(1) @MaxLength(2000) body: string;
}

export class UpdateMessageTemplateDtoServer {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(100) name?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(2000) body?: string;
}

export class RenderMessageTemplateDtoServer {
  @IsMongoId() groupId: string;
  @IsOptional() @IsMongoId() studentId?: string;
}

export class MessageTemplateIdPayload {
  @IsMongoId() id: string;
}

export class RenderMessageTemplatePayload extends RenderMessageTemplateDtoServer {
  @IsMongoId() id: string;
}
```

- [ ] **Step 4: Implement service**

```typescript
// apps/server/src/message-template/services/message-template.service.ts
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateMessageTemplateDtoServer, UpdateMessageTemplateDtoServer } from '../dto/message-template.dto';
import { MessageTemplate } from '../entities/message-template.entity';
import { validateVariables } from '../domain/template-render';
import { MessageTemplateErrors, TemplateContext } from '@darnozom/shared-types';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));

@Injectable()
export class MessageTemplateService {
  constructor(
    @InjectModel(MessageTemplate.name) private readonly model: Model<MessageTemplate>,
  ) {}

  async create(organizationId: string, createdBy: string, dto: CreateMessageTemplateDtoServer): Promise<MessageTemplate> {
    const unknown = validateVariables(dto.context as TemplateContext, dto.body);
    if (unknown.length > 0) {
      throw new BadRequestException(`${MessageTemplateErrors.UNKNOWN_TEMPLATE_VARIABLE}: ${unknown.join(', ')}`);
    }
    const existing = await this.model.findOne({ organizationId: oid(organizationId), name: dto.name, deletedAt: null });
    if (existing) throw new ConflictException(MessageTemplateErrors.TEMPLATE_NAME_TAKEN);
    return this.model.create({ organizationId: oid(organizationId), name: dto.name, context: dto.context, body: dto.body, createdBy: oid(createdBy) });
  }

  async findAll(organizationId: string): Promise<MessageTemplate[]> {
    return this.model.find({ organizationId: oid(organizationId), deletedAt: null }).sort({ name: 1 }).exec();
  }

  async findOne(organizationId: string, id: string): Promise<MessageTemplate> {
    const t = await this.model.findOne({ _id: oid(id), organizationId: oid(organizationId), deletedAt: null });
    if (!t) throw new NotFoundException(MessageTemplateErrors.TEMPLATE_NOT_FOUND);
    return t;
  }

  async update(organizationId: string, id: string, dto: UpdateMessageTemplateDtoServer): Promise<MessageTemplate> {
    const t = await this.findOne(organizationId, id);
    if (dto.name !== undefined && dto.name !== t.name) {
      const conflict = await this.model.findOne({ organizationId: oid(organizationId), name: dto.name, deletedAt: null, _id: { $ne: oid(id) } });
      if (conflict) throw new ConflictException(MessageTemplateErrors.TEMPLATE_NAME_TAKEN);
      t.name = dto.name;
    }
    if (dto.body !== undefined) {
      const unknown = validateVariables(t.context, dto.body);
      if (unknown.length > 0) throw new BadRequestException(`${MessageTemplateErrors.UNKNOWN_TEMPLATE_VARIABLE}: ${unknown.join(', ')}`);
      t.body = dto.body;
    }
    return t.save();
  }

  async remove(organizationId: string, id: string): Promise<void> {
    const t = await this.model.findOne({ _id: oid(id), organizationId: oid(organizationId), deletedAt: null });
    if (!t) throw new NotFoundException(MessageTemplateErrors.TEMPLATE_NOT_FOUND);
    t.deletedAt = new Date();
    await t.save();
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter server exec jest message-template.service --runInBand`
Expected: PASS 5/5

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/message-template/dto/ apps/server/src/message-template/services/message-template.service.ts apps/server/src/message-template/services/message-template.service.spec.ts
git commit -m "feat(sp9): add MessageTemplate CRUD service with variable validation"
```

---

### Task 5: Template render service (resolves live values)

**Files:**
- Create: `apps/server/src/message-template/services/template-render.service.ts`
- Create: `apps/server/src/message-template/services/template-render.service.spec.ts`

**Interfaces:**
- Consumes: `MessageTemplateService.findOne` (Task 4), `renderTemplate`, `normalizePhone` (Task 2), Group/Level/Course/User models.
- Produces: `TemplateRenderService.render(actor, templateId, dto): Promise<RenderTemplateResult>`

- [ ] **Step 1: Write failing tests**

```typescript
// apps/server/src/message-template/services/template-render.service.spec.ts
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { TemplateRenderService } from './template-render.service';

const ORG = new Types.ObjectId();
const GROUP_ID = new Types.ObjectId();
const STUDENT_ID = new Types.ObjectId();
const TEACHER_ID = new Types.ObjectId();

const makeGroup = (overrides = {}) => ({
  _id: GROUP_ID, organizationId: ORG,
  students: [{ studentId: STUDENT_ID, status: 'ACTIVE' }],
  schedule: [{ dayOfWeek: 6, startTime: '17:00', durationMinutes: 60 }],
  timezone: 'Africa/Cairo',
  meetingLink: 'https://meet.example.com',
  whatsappGroupLink: null,
  teacherId: TEACHER_ID,
  startDate: new Date('2026-11-01'),
  levelId: new Types.ObjectId(),
  ...overrides,
});

const makeStudent = (phone?: string) => ({
  _id: STUDENT_ID, firstName: 'Ahmed', lastName: 'Ali', phone,
  childUsersIds: [],
});

const makeService = (template: any, group: any, student: any, level: any, course: any, teacher: any) => {
  const templateService = { findOne: jest.fn(async () => template) };
  const groupModel = { findOne: jest.fn(async () => group) };
  const userModel = { findById: jest.fn(async (id: Types.ObjectId) => {
    if (String(id) === String(STUDENT_ID)) return student;
    if (String(id) === String(TEACHER_ID)) return teacher;
    return null;
  }) };
  const levelModel = { findById: jest.fn(async () => level) };
  const courseModel = { findById: jest.fn(async () => course) };
  return new TemplateRenderService(templateService as any, groupModel as any, userModel as any, levelModel as any, courseModel as any);
};

describe('TemplateRenderService.render', () => {
  it('renders a GROUP template with live values', async () => {
    const template = { context: 'GROUP', body: 'Join {{groupName}}' };
    const group = makeGroup();
    const service = makeService(template, group, null, { name: 'Arabic' }, { name: 'Quran' }, { firstName: 'Sara', lastName: 'T' });
    const result = await service.render({ _id: String(ORG), organizationId: String(ORG), roleName: 'MANAGER', additionalRoles: [] }, String(new Types.ObjectId()), { groupId: String(GROUP_ID) });
    expect(result.text).toContain('');
    expect(result.missingVariables).toBeInstanceOf(Array);
  });

  it('rejects when student is not in the group', async () => {
    const template = { context: 'STUDENT', body: '{{studentName}}' };
    const group = makeGroup({ students: [] });
    const service = makeService(template, group, makeStudent('+201234567890'), { name: 'Arabic' }, { name: 'Quran' }, { firstName: 'Sara', lastName: 'T' });
    await expect(
      service.render({ _id: String(ORG), organizationId: String(ORG), roleName: 'MANAGER', additionalRoles: [] }, String(new Types.ObjectId()), { groupId: String(GROUP_ID), studentId: String(STUDENT_ID) })
    ).rejects.toThrow(ForbiddenException);
  });

  it('includes phone and waLink when student has a phone', async () => {
    const template = { context: 'STUDENT', body: '{{studentName}}' };
    const group = makeGroup();
    const service = makeService(template, group, makeStudent('+20 123 456 7890'), { name: 'Arabic' }, { name: 'Quran' }, { firstName: 'Sara', lastName: 'T' });
    const result = await service.render({ _id: String(ORG), organizationId: String(ORG), roleName: 'MANAGER', additionalRoles: [] }, String(new Types.ObjectId()), { groupId: String(GROUP_ID), studentId: String(STUDENT_ID) });
    expect(result.phone).toBe('+20123456890');
    expect(result.waLink).toContain('wa.me');
  });

  it('omits waLink when student has no phone', async () => {
    const template = { context: 'STUDENT', body: '{{studentName}}' };
    const group = makeGroup();
    const service = makeService(template, group, makeStudent(undefined), { name: 'Arabic' }, { name: 'Quran' }, { firstName: 'Sara', lastName: 'T' });
    const result = await service.render({ _id: String(ORG), organizationId: String(ORG), roleName: 'MANAGER', additionalRoles: [] }, String(new Types.ObjectId()), { groupId: String(GROUP_ID), studentId: String(STUDENT_ID) });
    expect(result.phone).toBeUndefined();
    expect(result.waLink).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter server exec jest template-render.service --runInBand`
Expected: FAIL — `TemplateRenderService` not found

- [ ] **Step 3: Implement**

```typescript
// apps/server/src/message-template/services/template-render.service.ts
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DateTime } from 'luxon';
import { MessageTemplateErrors, RenderMessageTemplateDto, RenderTemplateResult } from '@darnozom/shared-types';
import { Group } from 'src/academics/group/entities/group.entity';
import { Level } from 'src/academics/level/entities/level.entity';
import { Course } from 'src/course/entities/course.entity';
import { User } from 'src/user/entities/user.entity';
import { AcademicsActor } from 'src/academics/common/actor';
import { MessageTemplateService } from './message-template.service';
import { renderTemplate, normalizePhone } from '../domain/template-render';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

@Injectable()
export class TemplateRenderService {
  constructor(
    private readonly templateService: MessageTemplateService,
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Level.name) private readonly levelModel: Model<Level>,
    @InjectModel(Course.name) private readonly courseModel: Model<Course>,
  ) {}

  async render(actor: AcademicsActor, templateId: string, dto: RenderMessageTemplateDto): Promise<RenderTemplateResult> {
    const template = await this.templateService.findOne(actor.organizationId, templateId);

    const group = await this.groupModel.findOne({ _id: oid(dto.groupId), organizationId: oid(actor.organizationId) });
    if (!group) throw new NotFoundException(MessageTemplateErrors.TEMPLATE_NOT_FOUND);

    if (template.context === 'STUDENT') {
      if (!dto.studentId) throw new ForbiddenException(MessageTemplateErrors.STUDENT_NOT_IN_GROUP);
      const inGroup = group.students.some((s) => String(s.studentId) === dto.studentId && s.status !== 'REMOVED');
      if (!inGroup) throw new ForbiddenException(MessageTemplateErrors.STUDENT_NOT_IN_GROUP);
    }

    const [level, course, teacher] = await Promise.all([
      this.levelModel.findById(group.levelId).lean<{ name: string } | null>().exec(),
      this.courseModel.findById((group as any).courseId).lean<{ name: string } | null>().exec(),
      this.userModel.findById((group as any).teacherId).lean<{ firstName: string; lastName: string } | null>().exec(),
    ]);

    const scheduleText = group.schedule
      .map((s) => `${DAY_NAMES[s.dayOfWeek]} ${s.startTime}`)
      .join(' & ');

    const startDateText = group.startDate
      ? DateTime.fromJSDate(group.startDate as Date).setZone(group.timezone || 'UTC').toISODate() ?? ''
      : '';

    const values: Record<string, string | undefined> = {
      groupName: (group as any).name,
      courseName: course?.name,
      levelName: level?.name,
      teacherName: teacher ? `${teacher.firstName} ${teacher.lastName}` : undefined,
      startDate: startDateText,
      schedule: scheduleText,
      meetingLink: group.meetingLink || undefined,
      whatsappGroupLink: group.whatsappGroupLink || undefined,
    };

    if (template.context === 'STUDENT' && dto.studentId) {
      const student = await this.userModel.findById(oid(dto.studentId)).lean<{ firstName: string; lastName: string; phone?: string; childUsersIds?: Types.ObjectId[] }>().exec();
      values.studentName = student ? `${student.firstName} ${student.lastName}` : undefined;
      const parentId = student?.childUsersIds?.[0]; // parent has childUsersIds pointing to student
      if (parentId) {
        const parent = await this.userModel.findById(parentId).lean<{ firstName: string; lastName: string; phone?: string }>().exec();
        values.parentName = parent ? `${parent.firstName} ${parent.lastName}` : undefined;
      }

      const { text, missingVariables } = renderTemplate(template.body, values);
      const rawPhone = student?.phone;
      if (rawPhone) {
        const phone = normalizePhone(rawPhone);
        return { text, missingVariables, phone, waLink: `https://wa.me/${phone}?text=${encodeURIComponent(text)}` };
      }
      return { text, missingVariables };
    }

    const { text, missingVariables } = renderTemplate(template.body, values);
    return { text, missingVariables };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter server exec jest template-render.service --runInBand`
Expected: PASS 4/4

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/message-template/services/template-render.service.ts apps/server/src/message-template/services/template-render.service.spec.ts
git commit -m "feat(sp9): add template render service with live value resolution"
```

---

### Task 6: NATS controller, module, role seeds

**Files:**
- Create: `apps/server/src/message-template/message-template.controller.message.ts`
- Create: `apps/server/src/message-template/message-template.controller.message.spec.ts`
- Create: `apps/server/src/message-template/message-template.module.ts`
- Modify: `apps/server/src/app.module.ts`
- Modify: `apps/server/src/role/seeds/role.owner.config.ts`
- Modify: `apps/server/src/role/seeds/role.manager.config.ts`
- Modify: `apps/server/src/role/seeds/role.coordinator.config.ts`
- Modify: `apps/server/src/role/seeds/roles.config.spec.ts`

**Interfaces:**
- Consumes: `MessageTemplateService`, `TemplateRenderService` (Tasks 4-5).
- Produces: NATS patterns `messageTemplates.create`, `messageTemplates.list`, `messageTemplates.update`, `messageTemplates.remove`, `messageTemplates.render`.

- [ ] **Step 1: Write failing controller test**

```typescript
// apps/server/src/message-template/message-template.controller.message.spec.ts
import { MessageTemplateControllerMessage } from './message-template.controller.message';

describe('MessageTemplateControllerMessage', () => {
  it('should be defined', () => {
    const templateService = { create: jest.fn(), findAll: jest.fn(), findOne: jest.fn(), update: jest.fn(), remove: jest.fn() };
    const renderService = { render: jest.fn() };
    const ctrl = new MessageTemplateControllerMessage(templateService as any, renderService as any);
    expect(ctrl).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter server exec jest message-template.controller.message --runInBand`
Expected: FAIL — module not found

- [ ] **Step 3: Implement controller**

```typescript
// apps/server/src/message-template/message-template.controller.message.ts
import { Controller } from '@nestjs/common';
import { Ctx, MessagePattern, Payload } from '@nestjs/microservices';
import { Actions, Subjects } from '@darnozom/shared-types';
import { RequirePermissionsGuard } from 'src/role/permission.decorator';
import { RpcValidationPipe } from 'src/utils/RpcValidationPipe';
import { ApplyRpcErrorHandling } from 'src/utils/docerators/error-handeling/class/ApplyRpcErrorHandling.decorator';
import { IUserContext } from 'src/utils/types/IUserContext.interface';
import { actorFromContext } from 'src/academics/common/actor';
import { MessageTemplateService } from './services/message-template.service';
import { TemplateRenderService } from './services/template-render.service';
import {
  CreateMessageTemplateDtoServer,
  MessageTemplateIdPayload,
  RenderMessageTemplatePayload,
  UpdateMessageTemplateDtoServer,
} from './dto/message-template.dto';

class UpdateMessageTemplatePayload extends MessageTemplateIdPayload {
  dto: UpdateMessageTemplateDtoServer;
}

@Controller()
@ApplyRpcErrorHandling
export class MessageTemplateControllerMessage {
  constructor(
    private readonly templateService: MessageTemplateService,
    private readonly renderService: TemplateRenderService,
  ) {}

  @RequirePermissionsGuard({ action: Actions.MANAGE, subject: Subjects.MESSAGE_TEMPLATE })
  @MessagePattern('messageTemplates.create')
  create(@Payload(new RpcValidationPipe()) payload: CreateMessageTemplateDtoServer, @Ctx() ctx: IUserContext) {
    const actor = actorFromContext(ctx);
    return this.templateService.create(actor.organizationId, actor._id, payload);
  }

  @RequirePermissionsGuard({ action: Actions.MANAGE, subject: Subjects.MESSAGE_TEMPLATE })
  @MessagePattern('messageTemplates.list')
  list(@Ctx() ctx: IUserContext) {
    return this.templateService.findAll(actorFromContext(ctx).organizationId);
  }

  @RequirePermissionsGuard({ action: Actions.MANAGE, subject: Subjects.MESSAGE_TEMPLATE })
  @MessagePattern('messageTemplates.update')
  update(@Payload(new RpcValidationPipe()) payload: UpdateMessageTemplatePayload, @Ctx() ctx: IUserContext) {
    return this.templateService.update(actorFromContext(ctx).organizationId, payload.id, payload.dto);
  }

  @RequirePermissionsGuard({ action: Actions.MANAGE, subject: Subjects.MESSAGE_TEMPLATE })
  @MessagePattern('messageTemplates.remove')
  remove(@Payload(new RpcValidationPipe()) payload: MessageTemplateIdPayload, @Ctx() ctx: IUserContext) {
    return this.templateService.remove(actorFromContext(ctx).organizationId, payload.id);
  }

  @RequirePermissionsGuard({ action: Actions.MANAGE, subject: Subjects.MESSAGE_TEMPLATE })
  @MessagePattern('messageTemplates.render')
  render(@Payload(new RpcValidationPipe()) payload: RenderMessageTemplatePayload, @Ctx() ctx: IUserContext) {
    return this.renderService.render(actorFromContext(ctx), payload.id, { groupId: payload.groupId, studentId: payload.studentId });
  }
}
```

- [ ] **Step 4: Implement module**

```typescript
// apps/server/src/message-template/message-template.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MessageTemplate, MessageTemplateSchema } from './entities/message-template.entity';
import { MessageTemplateService } from './services/message-template.service';
import { TemplateRenderService } from './services/template-render.service';
import { MessageTemplateControllerMessage } from './message-template.controller.message';
import { Group, GroupSchema } from 'src/academics/group/entities/group.entity';
import { Level, LevelSchema } from 'src/academics/level/entities/level.entity';
import { Course, CourseSchema } from 'src/course/entities/course.entity';
import { User, UserSchema } from 'src/user/entities/user.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MessageTemplate.name, schema: MessageTemplateSchema },
      { name: Group.name, schema: GroupSchema },
      { name: Level.name, schema: LevelSchema },
      { name: Course.name, schema: CourseSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [MessageTemplateControllerMessage],
  providers: [MessageTemplateService, TemplateRenderService],
})
export class MessageTemplateModule {}
```

Add to `app.module.ts` imports:
```typescript
import { MessageTemplateModule } from './message-template/message-template.module';
// add MessageTemplateModule to @Module imports array
```

Add to role seeds:
```typescript
// role.owner.config.ts, role.manager.config.ts, role.coordinator.config.ts — add:
{ action: Actions.MANAGE, subject: Subjects.MESSAGE_TEMPLATE },
```

Add to `roles.config.spec.ts` expectations for OWNER, MANAGER, COORDINATOR having MANAGE on MESSAGE_TEMPLATE.

- [ ] **Step 5: Run tests**

Run: `pnpm --filter server exec jest message-template.controller.message roles.config --runInBand`
Expected: PASS (controller defined + role assertions)

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/message-template/message-template.controller.message.ts apps/server/src/message-template/message-template.controller.message.spec.ts apps/server/src/message-template/message-template.module.ts apps/server/src/app.module.ts apps/server/src/role/seeds/
git commit -m "feat(sp9): wire NATS message patterns, module and role permissions"
```

---

### Task 7: Client data layer

**Files:**
- Create: `apps/client/src/lib/types/message-template/message-template.ts`
- Create: `apps/client/src/lib/actions/message-template/message-template.action.ts`
- Create: `apps/client/src/lib/actions/message-template/message-template.action.spec.ts`
- Create: `apps/client/src/lib/hooks/message-template/use-message-template.hook.ts`
- Create: `apps/client/src/lib/hooks/message-template/use-message-template.hook.spec.ts`

**Interfaces:**
- Consumes: `IMessageTemplate`, `RenderTemplateResult`, `CreateMessageTemplateDto`, `UpdateMessageTemplateDto`, `RenderMessageTemplateDto` from Task 1.
- Produces: `useMessageTemplates()`, `useRenderTemplate(id, dto)`, `useCreateTemplate()`, `useUpdateTemplate()`, `useDeleteTemplate()` hooks.

- [ ] **Step 1: Write failing tests**

```typescript
// apps/client/src/lib/actions/message-template/message-template.action.spec.ts
import { listMessageTemplates, renderMessageTemplate } from './message-template.action';

jest.mock('src/lib/utils/api/createAuthorizedNatsRequest', () => ({
  createAuthorizedNatsRequest: jest.fn(async (pattern: string) => {
    if (pattern === 'messageTemplates.list') return [{ _id: '1', name: 'Welcome', context: 'GROUP', body: 'Hello' }];
    if (pattern === 'messageTemplates.render') return { text: 'Hello', missingVariables: [] };
    return null;
  }),
}));

describe('listMessageTemplates', () => {
  it('returns an array of templates', async () => {
    const result = await listMessageTemplates();
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toMatchObject({ name: 'Welcome' });
  });
});

describe('renderMessageTemplate', () => {
  it('returns rendered text and missingVariables', async () => {
    const result = await renderMessageTemplate('1', { groupId: 'g1' });
    expect(result).toMatchObject({ text: 'Hello', missingVariables: [] });
  });
});
```

```typescript
// apps/client/src/lib/hooks/message-template/use-message-template.hook.spec.ts
import { renderHook } from '@testing-library/react';
import { useMessageTemplates } from './use-message-template.hook';

jest.mock('src/lib/actions/message-template/message-template.action', () => ({
  listMessageTemplates: jest.fn(async () => []),
}));
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(() => ({ data: [], isLoading: false })),
  useMutation: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

describe('useMessageTemplates', () => {
  it('returns data and isLoading', () => {
    const { result } = renderHook(() => useMessageTemplates());
    expect(result.current).toHaveProperty('data');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter client exec vitest run message-template --no-file-parallelism`
Expected: FAIL — modules not found

- [ ] **Step 3: Implement client types**

```typescript
// apps/client/src/lib/types/message-template/message-template.ts
import { IMessageTemplate, RenderTemplateResult } from '@darnozom/shared-types';
export type { IMessageTemplate, RenderTemplateResult };
```

- [ ] **Step 4: Implement server actions**

```typescript
// apps/client/src/lib/actions/message-template/message-template.action.ts
'use server';
import { createAuthorizedNatsRequest } from 'src/lib/utils/api/createAuthorizedNatsRequest';
import { IMessageTemplate, RenderTemplateResult, CreateMessageTemplateDto, UpdateMessageTemplateDto, RenderMessageTemplateDto } from '@darnozom/shared-types';

export async function listMessageTemplates(): Promise<IMessageTemplate[]> {
  return createAuthorizedNatsRequest('messageTemplates.list', {});
}

export async function createMessageTemplate(dto: CreateMessageTemplateDto): Promise<IMessageTemplate> {
  return createAuthorizedNatsRequest('messageTemplates.create', dto);
}

export async function updateMessageTemplate(id: string, dto: UpdateMessageTemplateDto): Promise<IMessageTemplate> {
  return createAuthorizedNatsRequest('messageTemplates.update', { id, dto });
}

export async function deleteMessageTemplate(id: string): Promise<void> {
  return createAuthorizedNatsRequest('messageTemplates.remove', { id });
}

export async function renderMessageTemplate(id: string, dto: RenderMessageTemplateDto): Promise<RenderTemplateResult> {
  return createAuthorizedNatsRequest('messageTemplates.render', { id, ...dto });
}
```

- [ ] **Step 5: Implement hooks**

```typescript
// apps/client/src/lib/hooks/message-template/use-message-template.hook.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RenderMessageTemplateDto } from '@darnozom/shared-types';
import {
  createMessageTemplate,
  deleteMessageTemplate,
  listMessageTemplates,
  renderMessageTemplate,
  updateMessageTemplate,
} from 'src/lib/actions/message-template/message-template.action';

const KEYS = {
  all: ['messageTemplates'] as const,
  render: (id: string, dto: RenderMessageTemplateDto) => ['messageTemplates', 'render', id, dto] as const,
};

export function useMessageTemplates() {
  return useQuery({ queryKey: KEYS.all, queryFn: listMessageTemplates });
}

export function useRenderTemplate(id: string, dto: RenderMessageTemplateDto, enabled = true) {
  return useQuery({
    queryKey: KEYS.render(id, dto),
    queryFn: () => renderMessageTemplate(id, dto),
    enabled: enabled && !!id && !!dto.groupId,
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createMessageTemplate,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Parameters<typeof updateMessageTemplate>[1] }) =>
      updateMessageTemplate(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteMessageTemplate,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm --filter client exec vitest run message-template --no-file-parallelism`
Expected: PASS 3/3

- [ ] **Step 7: Commit**

```bash
git add apps/client/src/lib/types/message-template/ apps/client/src/lib/actions/message-template/ apps/client/src/lib/hooks/message-template/
git commit -m "feat(sp9): add client data layer for WhatsApp templates"
```

---

### Task 8: Client UI — templates page, editor, send dialog, group screen integration

**Files:**
- Create: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/message-templates/page.tsx`
- Create: `apps/client/src/components/organs/message-template/template-editor.tsx`
- Create: `apps/client/src/components/organs/message-template/template-send-dialog.tsx`
- Create: `apps/client/src/components/organs/message-template/template-components.spec.tsx`
- Modify: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/academics/groups/[id]/__components/group-formation-screen.tsx`
- Modify: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/data.ts`
- Modify: `apps/client/messages/en.json`
- Modify: `apps/client/messages/ar.json`

**Interfaces:**
- Consumes: `useMessageTemplates`, `useRenderTemplate`, `useCreateTemplate`, `useUpdateTemplate`, `useDeleteTemplate` (Task 7).
- Produces: Full templates management page and send dialog integrated into group formation screen.

- [ ] **Step 1: Write failing component tests**

```typescript
// apps/client/src/components/organs/message-template/template-components.spec.tsx
import { render, screen } from '@testing-library/react';
import { TemplateSendDialog } from './template-send-dialog';

jest.mock('src/lib/hooks/message-template/use-message-template.hook', () => ({
  useMessageTemplates: jest.fn(() => ({ data: [{ _id: '1', name: 'Welcome', context: 'GROUP', body: 'Hello {{groupName}}' }], isLoading: false })),
  useRenderTemplate: jest.fn(() => ({ data: { text: 'Hello Math 101', missingVariables: [] }, isLoading: false })),
}));

describe('TemplateSendDialog', () => {
  it('renders without crashing', () => {
    render(
      <TemplateSendDialog
        open={true}
        onClose={() => {}}
        groupId="g1"
        context="GROUP"
      />
    );
    expect(screen.getByText('Welcome')).toBeInTheDocument();
  });

  it('shows rendered preview text', () => {
    render(
      <TemplateSendDialog
        open={true}
        onClose={() => {}}
        groupId="g1"
        context="GROUP"
      />
    );
    expect(screen.getByText('Hello Math 101')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter client exec vitest run template-components --no-file-parallelism`
Expected: FAIL — module not found

- [ ] **Step 3: Add i18n keys to both message files**

Add under `messageTemplates` namespace in both `en.json` and `ar.json`:

```json
"messageTemplates": {
  "title": "Message Templates",
  "newTemplate": "New Template",
  "editTemplate": "Edit Template",
  "deleteTemplate": "Delete Template",
  "templateName": "Template Name",
  "templateContext": "Context",
  "contextStudent": "Student",
  "contextGroup": "Group",
  "templateBody": "Message Body",
  "variables": "Variables",
  "insertVariable": "Insert Variable",
  "preview": "Preview",
  "missingVariables": "Missing values",
  "copyText": "Copy",
  "openWhatsApp": "Open in WhatsApp",
  "noPhone": "No phone number",
  "send": "Send",
  "confirmDelete": "Delete this template?",
  "nameTaken": "A template with this name already exists",
  "unknownVariable": "Unknown variable"
}
```

Arabic translations for the same keys.

- [ ] **Step 4: Implement TemplateSendDialog**

```tsx
// apps/client/src/components/organs/message-template/template-send-dialog.tsx
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { IMessageTemplate, TemplateContext } from '@darnozom/shared-types';
import { useMessageTemplates, useRenderTemplate } from 'src/lib/hooks/message-template/use-message-template.hook';

interface Props {
  open: boolean;
  onClose: () => void;
  groupId: string;
  context: TemplateContext;
  studentId?: string;
}

export function TemplateSendDialog({ open, onClose, groupId, context, studentId }: Props) {
  const t = useTranslations('messageTemplates');
  const { data: templates = [] } = useMessageTemplates();
  const [selectedId, setSelectedId] = useState<string>('');

  const filtered = templates.filter((t: IMessageTemplate) => t.context === context || t.context === 'GROUP');
  const { data: rendered } = useRenderTemplate(selectedId, { groupId, studentId }, !!selectedId);

  if (!open) return null;

  const copyText = () => rendered?.text && navigator.clipboard.writeText(rendered.text);

  return (
    <div role="dialog" aria-modal>
      <div>
        {filtered.map((tmpl: IMessageTemplate) => (
          <button key={tmpl._id} onClick={() => setSelectedId(tmpl._id)}
            style={{ fontWeight: selectedId === tmpl._id ? 'bold' : 'normal' }}>
            {tmpl.name}
          </button>
        ))}
      </div>
      {rendered && (
        <div>
          <pre>{rendered.text}</pre>
          {rendered.missingVariables.length > 0 && (
            <p>{t('missingVariables')}: {rendered.missingVariables.join(', ')}</p>
          )}
          <button onClick={copyText}>{t('copyText')}</button>
          {rendered.waLink ? (
            <a href={rendered.waLink} target="_blank" rel="noopener noreferrer">{t('openWhatsApp')}</a>
          ) : context === 'STUDENT' && (
            <span>{t('noPhone')}</span>
          )}
        </div>
      )}
      <button onClick={onClose}>✕</button>
    </div>
  );
}
```

- [ ] **Step 5: Implement TemplateEditor (list + create/edit form)**

```tsx
// apps/client/src/components/organs/message-template/template-editor.tsx
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { IMessageTemplate, TemplateContext, ALLOWED_VARIABLES } from '@darnozom/shared-types';
import { useMessageTemplates, useCreateTemplate, useUpdateTemplate, useDeleteTemplate } from 'src/lib/hooks/message-template/use-message-template.hook';

export function TemplateEditor() {
  const t = useTranslations('messageTemplates');
  const { data: templates = [], isLoading } = useMessageTemplates();
  const createMut = useCreateTemplate();
  const updateMut = useUpdateTemplate();
  const deleteMut = useDeleteTemplate();

  const [editing, setEditing] = useState<IMessageTemplate | null>(null);
  const [name, setName] = useState('');
  const [context, setContext] = useState<TemplateContext>('GROUP');
  const [body, setBody] = useState('');

  const openNew = () => { setEditing(null); setName(''); setContext('GROUP'); setBody(''); };
  const openEdit = (tmpl: IMessageTemplate) => { setEditing(tmpl); setName(tmpl.name); setContext(tmpl.context); setBody(tmpl.body); };

  const save = () => {
    if (editing) {
      updateMut.mutate({ id: editing._id, dto: { name, body } }, { onSuccess: () => setEditing(null) });
    } else {
      createMut.mutate({ name, context, body }, { onSuccess: openNew });
    }
  };

  const insertVariable = (v: string) => setBody((prev) => prev + `{{${v}}}`);

  return (
    <div>
      <button onClick={openNew}>{t('newTemplate')}</button>
      {isLoading ? null : (
        <ul>
          {(templates as IMessageTemplate[]).map((tmpl) => (
            <li key={tmpl._id}>
              {tmpl.name} ({tmpl.context})
              <button onClick={() => openEdit(tmpl)}>{t('editTemplate')}</button>
              <button onClick={() => deleteMut.mutate(tmpl._id)}>{t('deleteTemplate')}</button>
            </li>
          ))}
        </ul>
      )}
      <div>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('templateName')} />
        {!editing && (
          <select value={context} onChange={(e) => setContext(e.target.value as TemplateContext)}>
            <option value="GROUP">{t('contextGroup')}</option>
            <option value="STUDENT">{t('contextStudent')}</option>
          </select>
        )}
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder={t('templateBody')} rows={6} />
        <div>
          {ALLOWED_VARIABLES[context].map((v) => (
            <button key={v} onClick={() => insertVariable(v)}>{`{{${v}}}`}</button>
          ))}
        </div>
        <button onClick={save}>{editing ? t('editTemplate') : t('newTemplate')}</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Implement templates page**

```tsx
// apps/client/src/app/[locale]/(dashboard)/organization-dashboard/message-templates/page.tsx
import { useTranslations } from 'next-intl';
import { TemplateEditor } from 'src/components/organs/message-template/template-editor';

export default function MessageTemplatesPage() {
  return (
    <div>
      <TemplateEditor />
    </div>
  );
}
```

Add route to `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/data.ts` and route constants.

- [ ] **Step 7: Add "Message" button to group formation screen**

In `group-formation-screen.tsx`, add:
- A state `sendDialog: { open: boolean; context: TemplateContext; studentId?: string }`.
- In the student row actions: a "Message" button setting `sendDialog = { open: true, context: 'STUDENT', studentId }`.
- In the group header: a "Message" button for GROUP context.
- Render `<TemplateSendDialog>` when `sendDialog.open`.

- [ ] **Step 8: Run tests to verify they pass**

Run: `pnpm --filter client exec vitest run template-components --no-file-parallelism`
Expected: PASS 2/2

Run: `pnpm --filter client i18n:check-keys`
Expected: pass

- [ ] **Step 9: Commit**

```bash
git add apps/client/src/components/organs/message-template/ "apps/client/src/app/[locale]/(dashboard)/organization-dashboard/message-templates/" apps/client/messages/en.json apps/client/messages/ar.json "apps/client/src/app/[locale]/(dashboard)/organization-dashboard/academics/groups/[id]/__components/group-formation-screen.tsx" "apps/client/src/app/[locale]/(dashboard)/organization-dashboard/data.ts"
git commit -m "feat(sp9): add WhatsApp template editor page and send dialog on group screen"
```

---

### Task 9: Whole sub-project verification

- [ ] Run full server test suite: `pnpm --filter server exec jest --runInBand` — confirm no new failures beyond pre-existing baseline.
- [ ] Run targeted certificate + message-template suites: `pnpm --filter server exec jest src/message-template src/role --runInBand` — all pass.
- [ ] Run full client suite: `pnpm --filter client exec vitest run --no-file-parallelism` — all pass.
- [ ] Run `pnpm --filter server exec tsc --noEmit -p tsconfig.build.json` — 0 errors.
- [ ] Run `pnpm --filter client i18n:check-keys` — pass.
- [ ] Run `pnpm --filter server seed:prod` — verify role seeds apply without errors.
- [ ] Commit verification ledger entry.
