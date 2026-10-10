# AI Prompt File Attachments — Design

**Date:** 2026-05-19
**Status:** Approved (architecture, file structure, data flow, limits, Arabic-safe attachment pipeline, model escalation)
**Scope:** Quiz + Article AI generation flows only

---

## 1. Goal

Allow instructors to attach reference files (documents + images) to the prompt when
generating a quiz or article with AI. Files are **ephemeral** — used only for the one
generation call, never persisted. As part of the same change, raise the per-call quiz
question cap from 20 → 100.

**In scope**

- `POST /ai/generate-quiz`
- `POST /ai/generate-article`
- Their two client dialogs (`ai-generate-quiz`, `ai-generate-article`)
- Shared server action layer (`apps/client/src/lib/actions/ai/generate-content.action.ts`)
- `AiService` (`apps/server/src/ai/services/ai.service.ts`)

**Out of scope**

- The chat (`/ai/chat`) flow.
- Persistent file storage / lifecycle in S3 (these prompt attachments are not stored).
- Any change to the existing `AiContextService` course/module/content context pipeline.

---

## 2. Architecture

```
┌─────────────────────────┐     multipart/form-data      ┌─────────────────────────────┐
│ AiGenerateQuizDialog    │ ────────────────────────────► │ POST /ai/generate-quiz      │
│ AiGenerateArticleDialog │     prompt + files[]          │ POST /ai/generate-article   │
└─────────────────────────┘                               └──────────────┬──────────────┘
        │  yup validation                                                 │  class-validator
        │  (size, count, mime, count cap)                                 │  + ParseFilePipe rules
        │                                                                 ▼
        │                                                  ┌─────────────────────────────┐
        │                                                  │ AiAttachmentService (new)   │
        │                                                  │  - validate (mime/size)     │
        │                                                  │  - PDF / images: pass-thru  │
        │                                                  │  - DOCX: mammoth → text     │
        │                                                  │  - TXT / MD: read as text   │
        │                                                  └──────────────┬──────────────┘
        │                                                                 │ AI SDK content parts:
        │                                                                 │  { type: 'text',  ... }
        │                                                                 │  { type: 'file',  ... } (PDF)
        │                                                                 │  { type: 'image', ... }
        │                                                                 ▼
        │                                                  ┌─────────────────────────────┐
        │                                                  │ AiService                   │
        │                                                  │   .generateQuiz / Article   │
        │                                                  │   Model: gpt-4o-mini, OR    │
        │                                                  │     gpt-4o when files       │
        │                                                  │     attached (escalation)   │
        │                                                  └─────────────────────────────┘
```

**Why a separate `AiAttachmentService`:** the per-mime branching (pass-through vs.
DOCX extraction vs. text read), validation, and per-file/total budget enforcement
is the only piece that would otherwise bloat `AiService`. Keeping it isolated lets
`AiService` stay focused on prompting and lets us test the attachment pipeline
independently.

**Why native file parts instead of text extraction:** the user-facing content is
primarily Arabic. `pdf-parse` and similar libraries scramble RTL text, mis-render
Arabic ligatures, and fail outright on glyph-mapped (non-Unicode) Arabic fonts.
OpenAI's `gpt-4o` family handles Arabic PDFs and images natively when passed as
`{ type: 'file' | 'image' }` content parts via the AI SDK — the same shape the
existing `/ai/chat` flow already uses through `convertToModelMessages`. This both
gives us correct Arabic handling and reuses the model's native multimodal pipeline
instead of building a parallel extraction stack we'd have to maintain. DOCX still
needs `mammoth` because OpenAI does not read `.docx` directly; mammoth preserves
Arabic Unicode correctly.

**Why escalate to `gpt-4o` only when files are attached:** prompt-only generation
is the common case and stays cheap on `gpt-4o-mini` (matches the chat). When any
file is attached, the call is already a higher-stakes / higher-cost request, and
`gpt-4o` is materially better than mini at reading dense or scanned Arabic
material. The escalation is a single conditional in `AiService`.

---

## 3. File structure

### Client

```
apps/client/src/app/[locale]/(dashboard)/organization-dashboard/courses/__components/content/
├── ai-generate-quiz/
│   ├── ai-generate-quiz.tsx           # (updated) wires FilePicker, uses yup schema via RHF
│   └── ai-generate-quiz.schema.ts     # (updated) adds files validation
├── ai-generate-article/
│   ├── ai-generate-article.tsx        # (updated)
│   └── ai-generate-article.schema.ts  # (updated)
└── ai-generate-shared/                # NEW — shared between both dialogs
    ├── ai-attachment-picker.tsx       # drag-drop list + remove + per-file error UI
    ├── ai-attachment.constants.ts     # re-exports shared-types constants for client use
    └── ai-attachment.schema.ts        # yup file[] validator (reused by both schemas)
```

`apps/client/src/lib/actions/ai/generate-content.action.ts` updated to send `FormData`
instead of JSON.

### Server

```
apps/server/src/ai/
├── constants/
│   └── ai-attachment.constants.ts     # NEW — re-exports shared-types constants
├── dto/
│   └── generate-content.dto.ts        # (updated) raise quiz cap to 100; multipart-friendly fields
├── services/
│   ├── ai.service.ts                  # (updated) accept content parts; model escalation when parts present
│   └── ai-attachment.service.ts       # NEW — mime check + per-type handling (PDF/image pass-through, DOCX via mammoth, TXT/MD)
└── controllers/http/
    └── ai.controller.http.ts          # (updated) FilesInterceptor on the two endpoints
```

### Shared

```
libs/shared-types/src/lib/ai/
└── ai-attachment.constants.ts         # NEW — single source of truth (limits + MIME list)
```

---

## 4. Data flow (one generation call)

1. User picks up to 5 files in the dialog. Client validates synchronously via yup:
   count ≤ 5, each ≤ 10 MB, total ≤ 25 MB, MIME ∈ allowed set. Bad files are rejected
   with a per-file error and never sent.
2. Client POSTs `multipart/form-data` to `/ai/generate-quiz` (or `/ai/generate-article`).
   Fields: `questionCount`, `courseId?`, `moduleId?`, `contentId?`, `prompt?`, `files[]`.
3. NestJS controller uses
   `FilesInterceptor('files', 5, { limits: { fileSize: 10 * 1024 * 1024 } })`. A
   custom `ParseFilePipe` validator enforces total size and MIME allowlist.
4. `AiAttachmentService.process(files)` returns an array of AI SDK content parts
   plus a flag indicating whether any non-text attachment was included:
   - **PDF** → `{ type: 'file', mediaType: 'application/pdf', data: <Buffer>, filename }`
     (pass-through; the model reads the PDF natively).
   - **PNG / JPG / WEBP** → `{ type: 'image', image: <Buffer>, mediaType }`
     (pass-through; vision-capable model reads natively).
   - **DOCX** → `mammoth.extractRawText` → wrapped as
     `{ type: 'text', text: "Attached file: <name>\n<extracted>" }`.
     Mammoth preserves Arabic Unicode correctly.
   - **TXT / MD** → read as UTF-8 → wrapped as a `text` part the same way.
   - DOCX/TXT/MD extracted text is subject to a per-file budget of 30,000 chars
     and a cumulative cap of 80,000 chars to protect the model context window.
     Truncation is applied in file-order with an ellipsis marker. PDFs and images
     are not subject to this text budget (the model handles them within its own
     vision/file limits).
5. `AiService.generateQuiz(...)` / `.generateArticle(...)` builds the user message
   content as an array of parts:
   - existing context text block from `AiContextService` (unchanged)
   - the user's prompt string (existing behavior)
   - all parts returned from `AiAttachmentService.process(...)` (file / image / text)
   The AI SDK v6 `generateText` accepts this multi-part content directly — this is
   the same shape the existing `/ai/chat` flow uses internally via
   `convertToModelMessages(messages)`.
6. **Model selection**: if `AiAttachmentService` returned any parts, `AiService`
   calls the model with `gpt-4o`. Otherwise it uses `gpt-4o-mini` (the existing
   default). The chat flow is untouched and stays on `gpt-4o-mini`.
7. The existing JSON-parse + filter logic for quiz output is unchanged. The
   `aiAssistant` subscription limiter still fires once per call.

---

## 5. Validation rules (single source of truth)

`libs/shared-types/src/lib/ai/ai-attachment.constants.ts`:

```ts
export const AI_ATTACHMENT_MAX_FILES = 5;
export const AI_ATTACHMENT_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;     // 10 MB
export const AI_ATTACHMENT_MAX_TOTAL_SIZE_BYTES = 25 * 1024 * 1024;    // 25 MB
export const AI_ATTACHMENT_PER_FILE_TEXT_BUDGET = 30_000;              // chars
export const AI_ATTACHMENT_TOTAL_TEXT_BUDGET = 80_000;                 // chars
export const AI_ATTACHMENT_ALLOWED_MIME = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  'image/png',
  'image/jpeg',
  'image/webp',
] as const;
export const AI_QUIZ_MAX_QUESTIONS = 100;
```

- Client yup schema imports these directly.
- Server DTO uses `@Max(AI_QUIZ_MAX_QUESTIONS)`. The controller uses a custom
  `ParseFilePipe` validator built from the same constants.
- All user-visible error messages are translated via `next-intl`.

---

## 6. Error handling

**Client**

- Per-file inline errors (size / type) shown next to each file row.
- Aggregate error for total size / count shown above the picker.
- Submit button disabled while any error is present.

**Server**

- `BadRequestException` for limit violations with a translatable error code:
  - `AI_ATTACHMENT_TOO_LARGE` (per-file or total)
  - `AI_ATTACHMENT_BAD_TYPE`
  - `AI_ATTACHMENT_TOO_MANY`
  - `AI_QUIZ_QUESTION_COUNT_EXCEEDED`
- DOCX/TXT/MD extraction failures degrade gracefully: the failing file is logged
  and skipped; generation proceeds with the remaining inputs (consistent with the
  existing `.catch(() => null)` pattern in `ai.controller.http.ts`).
- PDF/image pass-through has no extraction step that can fail server-side — if the
  model itself can't read a file, that surfaces as an AI-side error (handled by
  the existing parse-failure path for quizzes; reported to the user for articles).
- If **all** attached files fail processing, the call still proceeds with prompt-only
  context (no hard error). If even one valid file survives, model escalation
  (`gpt-4o`) still applies.

**AI parse failure**

- Existing return-empty-array behavior in `generateQuiz` is unchanged.

---

## 7. Adjacent changes bundled in this work

These are not separate refactors — they are required to land this feature cleanly:

- **Raise quiz cap from 20 → 100** in server DTO and client clamp.
- **Wire yup into the two dialogs** via `react-hook-form` + `yupResolver`. The
  schema files exist today but the dialogs use raw `useState`. CLAUDE.md requires
  yup for forms, so we fix it as we touch the files.
- **Routes constants:** the existing AI route constants are reused; no new URL
  string literals are introduced in component code.

Explicitly **not** included:

- No changes to `AiContextService`.
- No changes to `/ai/chat`.
- No persistent storage of prompt attachments.

---

## 8. Dependencies to add

Server only:

- `mammoth` (DOCX → text) — small, no native deps, MIT, preserves Arabic Unicode.

PDFs and images are passed to the model directly via the AI SDK and require no
extraction library on the server. We explicitly do **not** add `pdf-parse` (it
mishandles Arabic).

---

## 9. Acceptance criteria

A user opening the AI quiz dialog can:

1. Attach up to 5 files (mix of PDF, DOCX, TXT, MD, PNG, JPG, WEBP).
2. See an inline error when a file is too large, the wrong type, or pushes total
   size past 25 MB; the offending file is not uploaded.
3. Request up to 100 questions.
4. Submit; the AI uses the attached files' content (text extracted, images sent
   natively) plus the prompt to generate questions.
5. See a clear error message if the server rejects the request for limit reasons.

The article dialog has the same behavior except for the question-count field.

The server rejects any request that violates the limits with a translatable error
code, even if the client is bypassed.
