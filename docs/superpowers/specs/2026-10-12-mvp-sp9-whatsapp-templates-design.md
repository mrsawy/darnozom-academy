# MVP Sub-project 9: WhatsApp Templates — Design

**Date:** 2026-10-12
**Status:** Awaiting written-spec review
**Depends on:** Sub-project 1 (groups, students)
**Scope authority:** `docs/MVP.md` §3 row 9. The concept's MVP list says "WhatsApp templates". The concept also says: "WhatsApp: Group management is tracked inside the system, even though group creation stays manual at first, and message templates use variables."

## 1. Goal

Staff keep message templates with variables. From a group or a student row, they pick a template, see the text filled in for that student or group, and send it through WhatsApp themselves.

## 2. Out of scope

- WhatsApp Business API sending, automatic sending and a send log. The concept says WhatsApp work stays manual at first, and the send log belongs to the notification engine, which is later.
- Creating WhatsApp groups. That stays manual, and sub-project 1 already tracks the group link and each student's "added to WhatsApp" status.

## 3. Sending (minimal reading of the concept)

The filled-in text is shown with two actions:
- **Copy**
- **Open in WhatsApp:** a `https://wa.me/<phone>?text=<url-encoded text>` link to the parent's phone number, or the student's if they have no parent. If the phone number is missing, the link is disabled with the reason "no phone".

A staff member then presses send in WhatsApp.

## 4. Data model

**MessageTemplate** (new, `whatsapp-template`): `{ organizationId, name (unique per organization), context: 'STUDENT' | 'GROUP', body: string (≤ 2000 characters), createdBy, updatedAt }`, with soft delete.

### Variables

Variables use the `{{name}}` syntax. Allowed variables:

| Context | Variables |
|---|---|
| GROUP and STUDENT | `groupName`, `courseName`, `levelName`, `teacherName`, `startDate`, `schedule`, `meetingLink`, `whatsappGroupLink` |
| STUDENT only | `studentName`, `parentName` |

- `schedule` is rendered as readable text in the group's timezone, for example "Sat & Mon 17:00".
- `startDate` is rendered in the organization locale.
- Saving a template with an unknown variable, or a STUDENT variable in a GROUP template, is rejected with `400 UNKNOWN_TEMPLATE_VARIABLE`, naming the variable.
- A variable with no value (e.g. no meeting link yet) renders as an empty string, and the response lists it under `missingVariables` so the UI can warn before sending.

## 5. Rules & API

- **Template management:** `POST|GET|PATCH|DELETE /message-templates`, by OWNER, MANAGER and COORDINATOR.
- **Rendering:** `POST /message-templates/:id/render` with `{ groupId, studentId? }` (`studentId` is required for STUDENT context). It returns `{ text, missingVariables, phone?, waLink? }`.
  - The caller needs `READ GROUP` on the group.
  - The student must be in the group.
- **Implementation:** rendering is a pure function, `renderTemplate(body, values)`, with no HTML or script evaluation.
- **Permissions:** a new subject, `MESSAGE_TEMPLATE`.

## 6. Screens (en + ar)

- **Templates page:** a list and an editor with a variable picker that inserts `{{...}}`.
- **Group formation screen:**
  - A "Message" action on each student row: pick a template, preview it, then Copy or Open in WhatsApp.
  - A group-level "Message" action for GROUP templates, which offers copy only (the text can be pasted into the WhatsApp group).

## 7. Testing

- **`renderTemplate`:** every variable; a missing value is listed; text that looks like a variable but isn't one (`{{ x }}` with spaces) is handled consistently.
- **Saving templates:** unknown variables are rejected.
- **Phone links:** the phone number is normalized to digits only for the wa.me link; a missing phone means no link.
- **Rendering:** a student who isn't in the group is rejected.
