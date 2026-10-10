# QR Attendance Check-In Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow students to self-check attendance by scanning a course QR code — printed by the organization — via native phone camera (deep-link) or an in-app scanner on both web and mobile.

**Architecture:** The QR encodes a deep-link URL (`/student-dashboard/check-in?courseId=...`). The server's `studentMarkByQr` is relaxed to derive `enrollmentId` from `(userId, courseId)` so the QR needs only `courseId`. The web adds a check-in route with an in-app scanner view. The mobile enrollment detail page adds a scanner screen that can submit both `courseId` and `enrollmentId`.

**Tech Stack:** NestJS (server), Next.js 14 App Router + next-intl + react-hook-form (web client), Expo Router + NativeWind + i18next (mobile), `@yudiel/react-qr-scanner` (web scanner), `expo-camera` CameraView (mobile scanner).

---

## File Map

### Server
| File | Action |
|------|--------|
| `apps/server/src/attendance/dto/student-mark-by-qr.dto.ts` | Modify — make `enrollmentId` optional |
| `apps/server/src/attendance/attendance.service.ts` | Modify — derive enrollment by `(userId, courseId)` when `enrollmentId` absent |

### Web — Shared
| File | Action |
|------|--------|
| `apps/client/src/lib/data/constants/routes.constants.ts` | Modify — add `ROUTE_STUDENT_CHECK_IN` |
| `apps/client/src/lib/utils/build-check-in-url.ts` | Create — encodes courseId into the deep-link URL |

### Web — Org side (course QR display)
| File | Action |
|------|--------|
| `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/courses/__components/course/course-qr-dialog/course-qr-dialog.tsx` | Create — "View QR" button + dialog + print |
| `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/courses/__components/course/course-attendance-section.tsx` | Modify — swap inline `<QrCode>` for `<CourseQrDialog>` |

### Web — Student side (check-in route)
| File | Action |
|------|--------|
| `apps/client/src/app/[locale]/(dashboard)/student-dashboard/check-in/page.tsx` | Create — route; switches on presence of `?courseId` |
| `apps/client/src/app/[locale]/(dashboard)/student-dashboard/check-in/__components/qr-scanner-view.tsx` | Create — in-app camera scanner using `@yudiel/react-qr-scanner` |
| `apps/client/src/app/[locale]/(dashboard)/student-dashboard/check-in/__components/check-in-result.tsx` | Create — auto-submits check-in and shows success/error state |
| `apps/client/src/app/[locale]/(dashboard)/student-dashboard/__components/StudentSideBar.tsx` | Modify — add "Check in" nav item |
| `apps/client/src/lib/actions/attendance/markStudentByQr.action.ts` | Verify (already correct — no change needed) |

### Web — i18n
| File | Action |
|------|--------|
| `apps/client/messages/en.json` | Modify — add `CourseForm.qrCode`, `CourseForm.viewQrCode`, `CourseForm.printQrCode`, `CourseForm.scanToCheckIn`, `StudentSidebar.navMain.checkIn`, `StudentCheckIn.*` namespace |
| `apps/client/messages/ar.json` | Modify — same keys in Arabic |

### Mobile
| File | Action |
|------|--------|
| `apps/lms-mobile/lib/action/attendance.action.ts` | Create — `markStudentByQr({ courseId, enrollmentId })` |
| `apps/lms-mobile/lib/utils/parse-check-in-url.ts` | Create — extract `courseId` from a scanned QR URL |
| `apps/lms-mobile/components/organs/attendance/qr-scanner.tsx` | Create — `expo-camera` CameraView wrapper with permission handling |
| `apps/lms-mobile/app/(tabs)/enrollments/[enrollmentId]/check-in.tsx` | Create — scanner screen; validates courseId matches enrollment |
| `apps/lms-mobile/app/(tabs)/enrollments/[enrollmentId]/index.tsx` | Modify — add "Scan to Check in" button |

---

## Task 1: Relax server DTO — make `enrollmentId` optional

**Files:**
- Modify: `apps/server/src/attendance/dto/student-mark-by-qr.dto.ts`
- Modify: `apps/server/src/attendance/attendance.service.ts` (lines 317-360)

- [ ] **Step 1: Update the DTO**

Replace the entire file content:

```typescript
// apps/server/src/attendance/dto/student-mark-by-qr.dto.ts
import { IsMongoId, IsNotEmpty, IsOptional } from 'class-validator';

export class StudentMarkByQrDto {
  @IsNotEmpty()
  @IsMongoId()
  courseId: string;

  @IsOptional()
  @IsMongoId()
  enrollmentId?: string;
}
```

- [ ] **Step 2: Update `studentMarkByQr` in attendance.service.ts**

Replace the `studentMarkByQr` method (currently at line ~317). The key change: when `dto.enrollmentId` is absent, build the filter without `_id` and let Mongoose find the enrollment by `(userId, courseId)`.

```typescript
async studentMarkByQr(dto: StudentMarkByQrDto, userId: Types.ObjectId | string) {
  const filter: Record<string, unknown> = {
    courseId: dto.courseId,
    userId: userId,
    status: Status.ACTIVE,
    subscription: {
      status: SubscriptionStatus.ACTIVE,
      ends_at: { $gt: new Date() },
    },
  };

  if (dto.enrollmentId) {
    filter['_id'] = dto.enrollmentId;
  }

  const enrollment = await this.queryService.findOneOrThrow<Enrollment & { course: Course }>(
    Enrollment.name,
    filter,
    undefined,
    {
      populate: [{ path: 'course', select: 'name attendanceSettings organizationId' }],
    }
  );

  if (!enrollment.course?.attendanceSettings) {
    throw new BadRequestException('Attendance settings not configured for this course');
  }

  const course = enrollment.course;
  const schedule = course.attendanceSettings.offlineSchedule ?? [];
  const now = new Date();

  if (!this.findActiveOfflineSlotForUser(schedule, userId, now)) {
    throw new BadRequestException('You can only mark attendance during your assigned offline session window for today');
  }

  const studentId =
    enrollment.userId instanceof Types.ObjectId
      ? enrollment.userId.toHexString()
      : String(enrollment.userId);

  return this.markAttendance(
    {
      date: now,
      courseId: dto.courseId,
      studentId,
      status: AttendanceStatus.PRESENT,
      notes: 'QR self check-in',
    },
    studentId,
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/attendance/dto/student-mark-by-qr.dto.ts apps/server/src/attendance/attendance.service.ts
git commit -m "feat(server): make enrollmentId optional in QR check-in — derive from userId+courseId"
```

---

## Task 2: Add route constant + URL builder utility (web)

**Files:**
- Modify: `apps/client/src/lib/data/constants/routes.constants.ts`
- Create: `apps/client/src/lib/utils/build-check-in-url.ts`

- [ ] **Step 1: Add `ROUTE_STUDENT_CHECK_IN` to routes constants**

Open `apps/client/src/lib/data/constants/routes.constants.ts` and append after the existing student routes:

```typescript
export const ROUTE_STUDENT_CHECK_IN = '/student-dashboard/check-in';
```

- [ ] **Step 2: Create the URL builder utility**

```typescript
// apps/client/src/lib/utils/build-check-in-url.ts
export function buildCheckInUrl(courseId: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/student-dashboard/check-in?courseId=${encodeURIComponent(courseId)}`;
}
```

> Note: The URL intentionally omits the locale segment. Next-intl middleware will redirect `/{locale}/student-dashboard/check-in` transparently, so the printed QR does not embed a specific locale.

- [ ] **Step 3: Commit**

```bash
git add apps/client/src/lib/data/constants/routes.constants.ts apps/client/src/lib/utils/build-check-in-url.ts
git commit -m "feat(web): add ROUTE_STUDENT_CHECK_IN constant and buildCheckInUrl utility"
```

---

## Task 3: CourseQrDialog — printable QR for organizations

**Files:**
- Create: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/courses/__components/course/course-qr-dialog/course-qr-dialog.tsx`
- Modify: `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/courses/__components/course/course-attendance-section.tsx`

- [ ] **Step 1: Create the dialog component**

```typescript
// apps/client/src/app/[locale]/(dashboard)/organization-dashboard/courses/__components/course/course-qr-dialog/course-qr-dialog.tsx
'use client';

import { QrCode } from '@/components/molecules';
import { Button } from '@/components/atoms/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/atoms/dialog';
import { buildCheckInUrl } from '@/lib/utils/build-check-in-url';
import { QrCode as QrCodeIcon, Printer } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface CourseQrDialogProps {
  courseId: string;
  courseName?: string;
}

export function CourseQrDialog({ courseId, courseName }: CourseQrDialogProps) {
  const t = useTranslations('CourseForm');
  const qrValue = buildCheckInUrl(courseId);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="flex items-center gap-2">
          <QrCodeIcon className="h-4 w-4" />
          {t('viewQrCode')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm print:border-none print:shadow-none">
        <DialogHeader className="print:hidden">
          <DialogTitle>{t('qrCode')}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          <QrCode value={qrValue} size={240} />
          {courseName ? (
            <p className="text-center text-base font-semibold">{courseName}</p>
          ) : null}
          <p className="text-center text-sm text-muted-foreground">{t('scanToCheckIn')}</p>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full print:hidden"
          onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          {t('printQrCode')}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Update `course-attendance-section.tsx` to use `CourseQrDialog`**

In `apps/client/src/app/[locale]/(dashboard)/organization-dashboard/courses/__components/course/course-attendance-section.tsx`:

Replace the import:
```typescript
import { QrCode } from '@/components/molecules';
```
With:
```typescript
import { CourseQrDialog } from './course-qr-dialog/course-qr-dialog';
```

Replace the `mode === 'update'` block at the bottom:
```typescript
{mode === 'update' ? (
  <div className="flex items-center space-x-2">
    <span className="text-sm font-medium">{t('qrCode')}</span>
    <QrCode value={courseId ?? ''} />
  </div>
) : null}
```
With:
```typescript
{mode === 'update' && courseId ? (
  <CourseQrDialog courseId={courseId} />
) : null}
```

- [ ] **Step 3: Commit**

```bash
git add "apps/client/src/app/[locale]/(dashboard)/organization-dashboard/courses/__components/course/course-qr-dialog/course-qr-dialog.tsx" "apps/client/src/app/[locale]/(dashboard)/organization-dashboard/courses/__components/course/course-attendance-section.tsx"
git commit -m "feat(org): replace inline QR with CourseQrDialog that includes print support"
```

---

## Task 4: Add i18n strings — web

**Files:**
- Modify: `apps/client/messages/en.json`
- Modify: `apps/client/messages/ar.json`

- [ ] **Step 1: Add keys to `en.json`**

Inside the `"CourseForm"` object, add after the last key before the closing `}`:
```json
"qrCode": "Course QR Code",
"viewQrCode": "View QR Code",
"printQrCode": "Print QR Code",
"scanToCheckIn": "Scan this code to check in to the session"
```

Inside the `"StudentSidebar"` → `"navMain"` object, add:
```json
"checkIn": "Check In"
```

Add a new top-level namespace after `"StudentSidebar"`:
```json
"StudentCheckIn": {
  "title": "Scan to Check In",
  "scannerPrompt": "Point your camera at the course QR code",
  "submitting": "Marking attendance…",
  "success": "Attendance marked successfully!",
  "alreadyMarked": "You have already checked in for this session.",
  "errorNoSlot": "No active session found for today.",
  "errorNotEnrolled": "You are not enrolled in this course.",
  "errorGeneric": "Something went wrong. Please try again.",
  "cameraPermissionDenied": "Camera access denied. Allow camera permission and reload.",
  "openScanner": "Open Scanner"
}
```

- [ ] **Step 2: Add keys to `ar.json`**

Inside `"CourseForm"`:
```json
"qrCode": "رمز QR للدورة",
"viewQrCode": "عرض رمز QR",
"printQrCode": "طباعة رمز QR",
"scanToCheckIn": "امسح هذا الرمز لتسجيل الحضور في الجلسة"
```

Inside `"StudentSidebar"` → `"navMain"`:
```json
"checkIn": "تسجيل الحضور"
```

Add new top-level namespace:
```json
"StudentCheckIn": {
  "title": "مسح رمز الحضور",
  "scannerPrompt": "وجّه الكاميرا نحو رمز QR الخاص بالدورة",
  "submitting": "جارٍ تسجيل الحضور…",
  "success": "تم تسجيل الحضور بنجاح!",
  "alreadyMarked": "لقد سجّلت حضورك في هذه الجلسة بالفعل.",
  "errorNoSlot": "لا توجد جلسة نشطة اليوم.",
  "errorNotEnrolled": "أنت غير مسجل في هذه الدورة.",
  "errorGeneric": "حدث خطأ ما. يرجى المحاولة مرة أخرى.",
  "cameraPermissionDenied": "تم رفض الوصول للكاميرا. اسمح بالوصول وأعد التحميل.",
  "openScanner": "فتح الماسح"
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/client/messages/en.json apps/client/messages/ar.json
git commit -m "feat(web): add i18n strings for QR dialog and student check-in route"
```

---

## Task 5: Install web scanner package

**Files:**
- Modify: `apps/client/package.json` (via pnpm)

- [ ] **Step 1: Install `@yudiel/react-qr-scanner`**

From the workspace root:
```bash
pnpm --filter @lms/client add @yudiel/react-qr-scanner
```

> `@yudiel/react-qr-scanner` uses the browser-native `BarcodeDetector` API with a WASM fallback via `@zxing`. It has no SSR issues when dynamically imported.

- [ ] **Step 2: Commit lockfile**

```bash
git add apps/client/package.json pnpm-lock.yaml
git commit -m "chore: add @yudiel/react-qr-scanner to web client"
```

---

## Task 6: Student check-in route — web

**Files:**
- Create: `apps/client/src/app/[locale]/(dashboard)/student-dashboard/check-in/__components/qr-scanner-view.tsx`
- Create: `apps/client/src/app/[locale]/(dashboard)/student-dashboard/check-in/__components/check-in-result.tsx`
- Create: `apps/client/src/app/[locale]/(dashboard)/student-dashboard/check-in/page.tsx`

- [ ] **Step 1: Create `qr-scanner-view.tsx`**

```typescript
// apps/client/src/app/[locale]/(dashboard)/student-dashboard/check-in/__components/qr-scanner-view.tsx
'use client';

import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { ROUTE_STUDENT_CHECK_IN } from '@/lib/data/constants/routes.constants';

const Scanner = dynamic(
  () => import('@yudiel/react-qr-scanner').then((m) => m.Scanner),
  { ssr: false },
);

function extractCourseId(text: string): string | null {
  try {
    const url = new URL(text);
    return url.searchParams.get('courseId');
  } catch {
    return null;
  }
}

export function QrScannerView() {
  const t = useTranslations('StudentCheckIn');
  const router = useRouter();

  const handleScan = (result: { rawValue: string }[]) => {
    const raw = result[0]?.rawValue;
    if (!raw) return;
    const courseId = extractCourseId(raw);
    if (courseId) {
      router.push(`${ROUTE_STUDENT_CHECK_IN}?courseId=${encodeURIComponent(courseId)}`);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-muted-foreground">{t('scannerPrompt')}</p>
      <div className="w-full max-w-xs overflow-hidden rounded-xl border">
        <Scanner
          onScan={handleScan}
          constraints={{ facingMode: 'environment' }}
          components={{ audio: false }}
          styles={{ container: { width: '100%', aspectRatio: '1' } }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `check-in-result.tsx`**

```typescript
// apps/client/src/app/[locale]/(dashboard)/student-dashboard/check-in/__components/check-in-result.tsx
'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { markStudentByQr } from '@/lib/actions/attendance/markStudentByQr.action';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/atoms/button';
import { Link } from '@/i18n/navigation';
import { ROUTE_STUDENT_COURSES } from '@/lib/data/constants/routes.constants';

type Status = 'submitting' | 'success' | 'error';

interface CheckInResultProps {
  courseId: string;
}

export function CheckInResult({ courseId }: CheckInResultProps) {
  const t = useTranslations('StudentCheckIn');
  const [status, setStatus] = useState<Status>('submitting');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    markStudentByQr(courseId)
      .then(() => setStatus('success'))
      .catch((err: unknown) => {
        const msg =
          (err as { response?: { data?: { message?: string | string[] } } })?.response?.data
            ?.message ?? '';
        const flat = Array.isArray(msg) ? msg[0] : msg;
        setErrorMessage(flat || t('errorGeneric'));
        setStatus('error');
      });
  }, [courseId, t]);

  if (status === 'submitting') {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{t('submitting')}</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <CheckCircle className="h-16 w-16 text-green-500" />
        <p className="text-center text-lg font-semibold">{t('success')}</p>
        <Button asChild variant="outline">
          <Link href={ROUTE_STUDENT_COURSES}>{t('openScanner')}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <XCircle className="h-16 w-16 text-destructive" />
      <p className="text-center text-lg font-semibold text-destructive">{errorMessage}</p>
      <Button asChild variant="outline">
        <Link href={ROUTE_STUDENT_CHECK_IN}>{t('openScanner')}</Link>
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: Create `page.tsx`**

```typescript
// apps/client/src/app/[locale]/(dashboard)/student-dashboard/check-in/page.tsx
import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { QrScannerView } from './__components/qr-scanner-view';
import { CheckInResult } from './__components/check-in-result';
import { Loader2 } from 'lucide-react';

interface CheckInPageProps {
  searchParams: Promise<{ courseId?: string }>;
}

export default async function CheckInPage({ searchParams }: CheckInPageProps) {
  const { courseId } = await searchParams;
  const t = await getTranslations('StudentCheckIn');

  return (
    <div className="flex flex-1 flex-col items-center gap-6 px-4 py-10">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin text-primary" />}>
        {courseId ? (
          <CheckInResult courseId={courseId} />
        ) : (
          <QrScannerView />
        )}
      </Suspense>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add "apps/client/src/app/[locale]/(dashboard)/student-dashboard/check-in/"
git commit -m "feat(web): add student check-in route with QR scanner and auto-submit result"
```

---

## Task 7: Add "Check In" to student sidebar

**Files:**
- Modify: `apps/client/src/app/[locale]/(dashboard)/student-dashboard/__components/StudentSideBar.tsx`

- [ ] **Step 1: Add the import and nav entry**

At the top, add `IconQrcode` to the tabler icons import:
```typescript
import {
  IconCalendarUser,
  IconDashboard,
  IconHelp,
  IconMessageCircle,
  IconQrcode,   // add this
  IconRobot,
  IconSearch,
  IconSettings,
  IconSparkles,
  IconUsers,
  IconWallet,
  IconCalendar,
} from '@tabler/icons-react';
```

Also add the route constant import:
```typescript
import {
  ROUTE_STUDENT_AI_SUBSCRIPTION,
  ROUTE_STUDENT_CHECK_IN,
} from '@/lib/data/constants/routes.constants';
```

Inside `useStudentSidebarData`, add to the `navMain` array after `bookings`:
```typescript
{
  title: t('navMain.checkIn'),
  url: ROUTE_STUDENT_CHECK_IN,
  icon: IconQrcode,
  key: 'check-in',
},
```

- [ ] **Step 2: Commit**

```bash
git add "apps/client/src/app/[locale]/(dashboard)/student-dashboard/__components/StudentSideBar.tsx"
git commit -m "feat(web): add Check In nav item to student sidebar"
```

---

## Task 8: Mobile — attendance action + URL parser

**Files:**
- Create: `apps/lms-mobile/lib/action/attendance.action.ts`
- Create: `apps/lms-mobile/lib/utils/parse-check-in-url.ts`

- [ ] **Step 1: Create `attendance.action.ts`**

```typescript
// apps/lms-mobile/lib/action/attendance.action.ts
import api from '../axios';

export async function markStudentByQr(payload: {
  courseId: string;
  enrollmentId?: string;
}): Promise<void> {
  await api.post('/attendance/student/qr', payload);
}
```

- [ ] **Step 2: Create `parse-check-in-url.ts`**

```typescript
// apps/lms-mobile/lib/utils/parse-check-in-url.ts

/** Extracts `courseId` from a QR deep-link URL like
 *  `https://example.com/student-dashboard/check-in?courseId=abc`
 *  Returns null if the URL cannot be parsed or has no courseId param. */
export function parseCourseIdFromQr(raw: string): string | null {
  try {
    const url = new URL(raw);
    return url.searchParams.get('courseId');
  } catch {
    return null;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/lms-mobile/lib/action/attendance.action.ts apps/lms-mobile/lib/utils/parse-check-in-url.ts
git commit -m "feat(mobile): add attendance action and QR URL parser utility"
```

---

## Task 9: Mobile — install expo-camera (if not already present)

**Files:**
- Modify: `apps/lms-mobile/package.json` (via expo install)

- [ ] **Step 1: Check if `expo-camera` is already a dependency**

```bash
grep "expo-camera" apps/lms-mobile/package.json
```

If found, skip to Task 10. If not found:

- [ ] **Step 2: Install**

From the `apps/lms-mobile` directory (or using the workspace filter):
```bash
cd apps/lms-mobile && npx expo install expo-camera
```

> `expo install` picks the version compatible with your Expo SDK. Do NOT use `pnpm add` directly for expo packages.

- [ ] **Step 3: Add camera permission to `app.json`** (iOS only; Android permission is declared in the manifest automatically by Expo)

Open `apps/lms-mobile/app.json`. Inside the `"expo"` → `"ios"` → `"infoPlist"` object (create it if absent), add:
```json
"NSCameraUsageDescription": "Used to scan attendance QR codes"
```

- [ ] **Step 4: Commit**

```bash
git add apps/lms-mobile/package.json apps/lms-mobile/pnpm-lock.yaml apps/lms-mobile/app.json
git commit -m "chore(mobile): add expo-camera and camera permission for QR scanning"
```

---

## Task 10: Mobile — QrScanner organ component

**Files:**
- Create: `apps/lms-mobile/components/organs/attendance/qr-scanner.tsx`

- [ ] **Step 1: Create the component**

```typescript
// apps/lms-mobile/components/organs/attendance/qr-scanner.tsx
import { useEffect, useRef, useState } from 'react';
import { View, Alert } from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

interface QrScannerProps {
  onScan: (raw: string) => void;
  prompt?: string;
}

export function QrScanner({ onScan, prompt }: QrScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const scanned = useRef(false);
  const [active, setActive] = useState(true);

  useEffect(() => {
    return () => {
      scanned.current = false;
    };
  }, []);

  if (!permission) {
    return <View className="flex-1 items-center justify-center" />;
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 items-center justify-center gap-4 px-6">
        <Text className="text-center text-muted-foreground">
          Camera access is required to scan QR codes.
        </Text>
        <Button onPress={requestPermission}>
          <Text>Grant Permission</Text>
        </Button>
      </View>
    );
  }

  const handleBarCodeScanned = ({ data }: BarcodeScanningResult) => {
    if (scanned.current || !active) return;
    scanned.current = true;
    setActive(false);
    onScan(data);
  };

  return (
    <View className="flex-1">
      {prompt ? (
        <Text className="px-4 py-2 text-center text-sm text-muted-foreground">{prompt}</Text>
      ) : null}
      <CameraView
        className="flex-1"
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={active ? handleBarCodeScanned : undefined}
      />
    </View>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/lms-mobile/components/organs/attendance/qr-scanner.tsx
git commit -m "feat(mobile): add QrScanner organ component using expo-camera CameraView"
```

---

## Task 11: Mobile — check-in screen

**Files:**
- Create: `apps/lms-mobile/app/(tabs)/enrollments/[enrollmentId]/check-in.tsx`

- [ ] **Step 1: Create the screen**

```typescript
// apps/lms-mobile/app/(tabs)/enrollments/[enrollmentId]/check-in.tsx
import { useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Toast } from 'toastify-react-native';
import { useTranslation } from 'react-i18next';
import { QrScanner } from '@/components/organs/attendance/qr-scanner';
import { parseCourseIdFromQr } from '@/lib/utils/parse-check-in-url';
import { markStudentByQr } from '@/lib/action/attendance.action';
import { useEnrollment } from '@/lib/hooks/enrollments.hook';
import { Text } from '@/components/ui/text';
import { CheckCircle, XCircle } from 'lucide-react-native';

type ScreenState = 'scanning' | 'submitting' | 'success' | 'error';

export default function CheckInScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { enrollmentId } = useLocalSearchParams<{ enrollmentId: string }>();
  const { data } = useEnrollment(enrollmentId);
  const [state, setState] = useState<ScreenState>('scanning');
  const [errorMsg, setErrorMsg] = useState('');

  const handleScan = async (raw: string) => {
    const scannedCourseId = parseCourseIdFromQr(raw);

    if (!scannedCourseId) {
      Toast.error('Invalid QR code');
      setState('scanning');
      return;
    }

    const expectedCourseId = data?.enrollment?.courseId;
    if (expectedCourseId && scannedCourseId !== expectedCourseId) {
      Toast.error('This QR code is for a different course');
      setState('scanning');
      return;
    }

    setState('submitting');
    try {
      await markStudentByQr({ courseId: scannedCourseId, enrollmentId });
      setState('success');
      Toast.success('Attendance marked!');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string | string[] } } })?.response?.data
          ?.message ?? 'Something went wrong';
      setErrorMsg(Array.isArray(msg) ? msg[0] : msg);
      setState('error');
    }
  };

  if (state === 'scanning') {
    return (
      <QrScanner
        onScan={handleScan}
        prompt="Point your camera at the course attendance QR code"
      />
    );
  }

  if (state === 'submitting') {
    return (
      <View className="flex-1 items-center justify-center gap-4">
        <ActivityIndicator size="large" />
        <Text className="text-muted-foreground">Marking attendance…</Text>
      </View>
    );
  }

  if (state === 'success') {
    return (
      <View className="flex-1 items-center justify-center gap-4 px-6">
        <CheckCircle size={64} color="#22c55e" />
        <Text className="text-center text-xl font-bold">Attendance marked successfully!</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center gap-4 px-6">
      <XCircle size={64} color="#ef4444" />
      <Text className="text-center text-base font-semibold text-destructive">{errorMsg}</Text>
    </View>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "apps/lms-mobile/app/(tabs)/enrollments/[enrollmentId]/check-in.tsx"
git commit -m "feat(mobile): add check-in scanner screen for enrollment route"
```

---

## Task 12: Mobile — "Scan to Check In" button on enrollment detail

**Files:**
- Modify: `apps/lms-mobile/app/(tabs)/enrollments/[enrollmentId]/index.tsx`

- [ ] **Step 1: Add QrCode icon import and button**

Add import at top of file:
```typescript
import { QrCode } from 'lucide-react-native';
```

Inside the `return` block, add the button after the "Renewal Banner" section and before the "Progress Card" section (around line 226). Place it inside a `<View className="mx-4 mt-4">`:

```typescript
{/* Check-in button — always visible for active enrollments */}
<View className="mx-4 mt-4">
  <Button
    onPress={() => router.push(`/enrollments/${enrollmentId}/check-in`)}
    className="flex-row items-center gap-2">
    <QrCode size={18} color="white" />
    <Text className="font-semibold text-white">Scan to Check In</Text>
  </Button>
</View>
```

- [ ] **Step 2: Commit**

```bash
git add "apps/lms-mobile/app/(tabs)/enrollments/[enrollmentId]/index.tsx"
git commit -m "feat(mobile): add Scan to Check In button on enrollment detail page"
```

---

## Self-Review Checklist

- [x] **Spec coverage**: server DTO ✓, enrollment derivation ✓, org QR dialog ✓, web check-in route (scanner + auto-submit) ✓, student sidebar nav ✓, mobile attendance action ✓, mobile scanner screen ✓, mobile enrollment button ✓, i18n both locales ✓
- [x] **No placeholders**: all code blocks are complete
- [x] **Type consistency**: `CourseQrDialog` takes `courseId: string`, `buildCheckInUrl(courseId: string)` — consistent. `markStudentByQr` on mobile takes `{ courseId, enrollmentId? }` matching updated server DTO. `parseCourseIdFromQr` returns `string | null` — checked for null in check-in screen ✓
- [x] **`buildCheckInUrl` is SSR-safe**: uses `typeof window !== 'undefined'` guard. The org course form is a client component so `window` will be defined at call time ✓
- [x] **`qrCode` i18n key**: was missing in messages files — added in Task 4 ✓
- [x] **Mobile scan guard**: `scanned.current` ref prevents double-submit on the same scan ✓
