---
name: api-error-messages
description: >-
  Standard pattern for API error/success strings: shared-types enums, root `errors`
  in en.json/ar.json, translateApiMessage. USE WHEN adding or changing backend
  exception messages, NATS error text, toast copy from the server, ALL_ERROR_KEYS,
  Mongoose schema hook invalidate() calls, or when the user asks to internationalize
  API errors or stop hardcoding English on the server.
---

# API error messages

**Canonical instructions:** `.agents/skills/api-error-messages/SKILL.md`

Follow that file for the full workflow, NestJS examples, Mongoose hook examples, and anti-patterns. This entry exists under `.cursor/skills` for discovery alongside the repo copy in `.agents/skills`.
