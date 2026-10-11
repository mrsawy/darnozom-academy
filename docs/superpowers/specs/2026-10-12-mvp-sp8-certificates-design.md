# MVP Sub-project 8: Certificates — Design

**Date:** 2026-10-12
**Status:** Awaiting written-spec review
**Depends on:** Sub-project 2 (attendance, report homework scores, group `COMPLETED`); Sub-project 6 (ledger, for the payment rule)
**Scope authority:** `docs/MVP.md` §3 row 8. The concept says: "Eligibility rules (attendance, homework, exam, payment) are configurable. Certificates have QR verification, serial numbers and name review in Arabic and English."

## 1. Goal

When a group completes, the system works out which students are eligible under the level's configured rules. The student's Arabic and English names are reviewed. Each eligible student is then issued a certificate with a unique serial number and a QR code that links to a public verification page.

## 2. Out of scope

- **Graduation ceremony tasks:** concept task automation, not in the MVP list.
- **Revocation and a certificate design editor:** not in the concept.

## 3. Decision (from your answers)

The **exam** rule uses a final **PASS/FAIL result** that the teacher enters for each student. There is no exam module.

## 4. Data model

### 4.1 Level (from sub-project 1): `certificateRules`

`{ minAttendancePercent?: 0–100, minHomeworkAverage?: 1–5, requireExamPass?: boolean, requireFullyPaid?: boolean }`

Every rule is optional; a rule that isn't set isn't checked. They are edited on the level by `MANAGE LEVEL`.

### 4.2 Group student (from sub-projects 1/2): new field

`finalResult?: 'PASS' | 'FAIL'`, plus `finalResultBy?` and `finalResultAt?`. It is set by the group's teacher while the group is `RUNNING` or `COMPLETED`.

### 4.3 Certificate (new module `certificate`)

| Field | Type | Notes |
|---|---|---|
| `organizationId`, `groupId`, `levelId`, `courseId`, `studentId` | ObjectId | unique on `{groupId, studentId}` |
| `status` | `ELIGIBLE \| NAME_REVIEW \| ISSUED` | |
| `eligibility` | `{ attendancePercent, homeworkAverage, examPassed?, fullyPaid?, rulesSnapshot }` | computed at the time of evaluation |
| `nameAr`, `nameEn` | string | pre-filled from the user's first and last name |
| `nameConfirmedBy?`, `nameConfirmedAt?` | | |
| `serial?` | string | unique; assigned at issue |
| `verificationToken?` | string | a random 128-bit token in URL-safe base64; assigned at issue |
| `issuedBy?`, `issuedAt?` | | |

## 5. Rules

### 5.1 Eligibility

When a group becomes `COMPLETED`, eligibility is evaluated for each `ACTIVE` student:

- **Attendance:** `attendancePercent` = number of `PRESENT`, `LATE` or `EXCUSED` records ÷ number of `COMPLETED` sessions × 100 (assumption A1).
- **Homework:** `homeworkAverage` = the mean of the student's `homework` scores across all reports.
- **Exam:** `examPassed` = `finalResult === 'PASS'`.
- **Payment:** `fullyPaid` = the student's payment status in the group is `PAID` (sub-project 6 §6.2) and the student has no overdue charges for that group.

A `Certificate` in `ELIGIBLE` is created only for students who pass every rule that is set.

Re-evaluation can be triggered by `MANAGE GROUP`, for example after a late payment. It adds newly eligible students and never removes an issued certificate.

### 5.2 Name review

- Moving `ELIGIBLE → NAME_REVIEW` happens automatically when the certificate is created, and the parent (or the student, if they have no parent) is notified in-app.
- The parent or student confirms or corrects `nameAr` and `nameEn` (both required, at most 100 characters each). The coordinator (`MANAGE GROUP`) can also edit and confirm them.
- Confirming records `nameConfirmedBy` and `nameConfirmedAt`.

### 5.3 Issue

- **Who and when:** `POST /certificates/:id/issue` (`MANAGE GROUP`) requires the name to be confirmed.
- **Serial number:** assigned atomically from a per-organization counter (a `counters` collection updated with `findOneAndUpdate` + `$inc`). The format is `{ORG_SHORT}-{YYYY}-{000001}`, where `ORG_SHORT` is a new organization field of 3–6 uppercase letters, set in the organization settings (assumption A2).
- **Verification token:** a random token is generated, and the status becomes `ISSUED`. Once issued, a certificate can't be changed.

### 5.4 Verification and display

- **Public verification page:** `GET /public/certificates/verify/:token`, with no authentication. It returns the student's Arabic and English names, the course and level, the organization name, the issue date and the serial number. It returns nothing else: no ids, no contact details. An unknown token gets a 404.
- **QR code:** generated on the server with the existing `qrcode` dependency. It encodes the client URL `/{locale}/verify/{token}`.
- **Certificate view:** a printable HTML page in the client at `/certificates/:id`, visible to the owner, their parent and staff, showing the names, course, level, date, serial and QR code. It is printed or saved as PDF from the browser, so no PDF library is needed (assumption A3).

### 5.5 Permissions

- New subject: `CERTIFICATE`.
- **MANAGE GROUP roles:** manage certificates, including issuing.
- **PARENT and STUDENT:** read and confirm the names on their own certificates.
- **INSTRUCTOR:** set `finalResult` for students in their own groups.

## 6. API

- `PATCH /groups/:id/students/:studentId/final-result`
- `POST /groups/:id/certificates/evaluate`
- `GET /certificates?groupId=&studentId=`
- `PATCH /certificates/:id/name`
- `POST /certificates/:id/confirm-name`
- `POST /certificates/:id/issue`
- `GET /public/certificates/verify/:token`

## 7. Screens (en + ar)

- **Level form:** the certificate rules.
- **Teacher:** a final result (PASS/FAIL) column on the group page.
- **Group page:** a certificates tab with eligibility details and the issue action.
- **Parent and student:** the name review form and their issued certificates.
- **Public:** the verification page.

## 8. Testing

- **Eligibility:** each rule applied, and a rule that isn't set is ignored.
- **Attendance percentage:** cancelled sessions are excluded.
- **Issue:** blocked until the name is confirmed.
- **Serial numbers:** unique and sequential under concurrent issuing.
- **Immutability:** an issued certificate can't be changed.
- **Verify endpoint:** returns only the allowed fields; an unknown token gets a 404.

## 9. Assumptions to confirm

- **A1:** `EXCUSED` counts as attended for the attendance percentage.
- **A2:** The serial format is `{ORG_SHORT}-{YYYY}-{000001}`.
- **A3:** The certificate is a printable HTML page (print or save as PDF from the browser), not a generated PDF file.
