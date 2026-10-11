'use client';

import { Button } from '@/components/atoms/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/atoms/dialog';
import { Image } from '@/components/molecules';
import Video from '@/components/molecules/video-player/Video-dice';
import { Pricing } from '@/lib/schema/course.schema';
import type { ICourse } from '@/lib/types/course/course.interface';
import { getFileFullUrl } from '@/lib/utils/getFileFullUrl';
import { formatDate } from '@fullcalendar/core/index.js';
import { Currency } from '@darnozom/shared-types';
import { useTranslations } from 'next-intl';

export interface CoursePendingUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: ICourse | null;
}

export function coursePendingCurrentDataFromCourse(course: ICourse): Record<string, unknown> {
  return {
    name: course.name,
    description: course.description,
    shortDescription: course.shortDescription,
    isPaid: course.isPaid,
    pricing: course.pricing,
    settings: course.settings,
    attendanceSettings: course.attendanceSettings,
    language: course.language,
    duration: course.duration,
    learningObjectives: course.learningObjectives,
    thumbnailKey: course.thumbnailKey,
    trailerKey: course.trailerKey,
    categories: course.categories?.map((c) => ({
      _id: c._id,
      name: c.name,
    })),
    instructor: course.instructor,
    coInstructors: course.coInstructors?.map((u) => ({
      _id: u._id,
      firstName: u.firstName,
      lastName: u.lastName,
      username: u.username,
    })),
  };
}

export function CoursePendingChangesDiff({
  currentData,
  pendingUpdate,
}: {
  currentData: Record<string, unknown>;
  pendingUpdate: Record<string, unknown>;
}) {
  const t = useTranslations('CourseDataTable');
  const changedKeys = Object.keys(pendingUpdate);
  if (changedKeys.length === 0) {
    return (
      <p className="text-muted-foreground py-4 text-center text-sm">
        {t('dialogs.pendingUpdate.noChanges')}
      </p>
    );
  }
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="text-muted-foreground font-medium">
          {t('dialogs.pendingUpdate.current')}
        </div>
        <div className="text-muted-foreground font-medium">
          {t('dialogs.pendingUpdate.proposed')}
        </div>
        {changedKeys.map((key) => (
          <div key={key} className="contents">
            <div className="bg-muted/50 rounded p-2">
              <span className="text-muted-foreground mb-1 block text-xs">{t(key)}</span>
              <PendingUpdateValue keyName={key} value={currentData[key]} />
            </div>
            <div className="rounded border border-green-200 bg-green-50 p-2 dark:border-green-800 dark:bg-green-950/20">
              <span className="text-muted-foreground mb-1 block text-xs">{t(key)}</span>
              <PendingUpdateValue keyName={key} value={pendingUpdate[key]} bold />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CoursePendingUpdateDialog({
  open,
  onOpenChange,
  course,
}: CoursePendingUpdateDialogProps) {
  const t = useTranslations('CourseDataTable');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('dialogs.pendingUpdate.title')}</DialogTitle>
          <DialogDescription>{t('dialogs.pendingUpdate.description')}</DialogDescription>
        </DialogHeader>
        {course ? (
          <CoursePendingChangesDiff
            currentData={coursePendingCurrentDataFromCourse(course)}
            pendingUpdate={course.pendingUpdate ?? {}}
          />
        ) : null}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">{t('buttons.close')}</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function isPersonObject(
  v: unknown
): v is { _id?: string; firstName: string; lastName: string; username?: string } {
  return typeof v === 'object' && v !== null && 'firstName' in v && 'lastName' in v;
}

function isPersonArray(
  v: unknown
): v is { _id?: string; firstName: string; lastName: string; username?: string }[] {
  return Array.isArray(v) && v.length > 0 && v.every(isPersonObject);
}

function isNamedObjectArray(v: unknown): v is { _id?: string; name: string }[] {
  return (
    Array.isArray(v) &&
    v.length > 0 &&
    v.every((item) => typeof item === 'object' && item !== null && 'name' in item)
  );
}

function isAllNullish(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v !== 'object' || Array.isArray(v)) return false;
  return Object.values(v as Record<string, unknown>).every(
    (val) => val === null || val === undefined
  );
}

function formatPersonName(p: { firstName: string; lastName: string; username?: string }): string {
  return p.username
    ? `${p.firstName} ${p.lastName} (@${p.username})`
    : `${p.firstName} ${p.lastName}`;
}

function CompactKeyValue({
  obj,
  bold,
  depth = 0,
}: {
  obj: Record<string, unknown>;
  bold?: boolean;
  depth?: number;
}) {
  const t = useTranslations('CourseDataTable');
  const entries = Object.entries(obj).filter(([, v]) => {
    if (v === null || v === undefined) return false;
    if (typeof v === 'object' && !Array.isArray(v) && isAllNullish(v)) return false;
    return true;
  });
  if (entries.length === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <div
      className={`space-y-0.5 text-xs ${bold ? 'font-medium' : ''}`}
      style={depth > 0 ? { paddingInlineStart: '0.75rem' } : undefined}>
      {entries.map(([k, v]) => {
        if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
          return (
            <div key={k}>
              <span className="text-muted-foreground">{t(k)}:</span>
              <CompactKeyValue obj={v as Record<string, unknown>} bold={bold} depth={depth + 1} />
            </div>
          );
        }
        if (Array.isArray(v)) {
          if (v.length === 0) {
            return (
              <div key={k} className="flex gap-1.5">
                <span className="text-muted-foreground shrink-0">{t(k)}:</span>
                <span className="wrap-break-word">—</span>
              </div>
            );
          }
          if (k.endsWith('Ids') || k.endsWith('IDs')) {
            return (
              <div key={k} className="flex gap-1.5">
                <span className="text-muted-foreground shrink-0">{t(k)}:</span>
                <span className="wrap-break-word">{v.length}</span>
              </div>
            );
          }
          if (v.length > 0 && typeof v[0] === 'object' && v[0] !== null) {
            return (
              <div key={k}>
                <span className="text-muted-foreground">{t(k)}:</span>
                <div className="space-y-1">
                  {v.map((item, i) => (
                    <CompactKeyValue
                      key={i}
                      obj={item as Record<string, unknown>}
                      bold={bold}
                      depth={depth + 1}
                    />
                  ))}
                </div>
              </div>
            );
          }
          const display = v.map(String).join(', ');
          return (
            <div key={k} className="flex gap-1.5">
              <span className="text-muted-foreground shrink-0">{t(k)}:</span>
              <span className="wrap-break-word">{display}</span>
            </div>
          );
        }
        let display: string;
        if (typeof v === 'boolean') display = v ? t('booleanLabels.yes') : t('booleanLabels.no');
        else display = String(v);
        return (
          <div key={k} className="flex gap-1.5">
            <span className="text-muted-foreground shrink-0">{t(k)}:</span>
            <span className="wrap-break-word">{display}</span>
          </div>
        );
      })}
    </div>
  );
}

function PendingUpdateValue({
  value,
  bold,
  keyName,
}: {
  value: unknown;
  bold?: boolean;
  keyName?: string;
}) {
  const t = useTranslations('CourseDataTable');

  if (value === null || value === undefined) {
    return <span className={`wrap-break-word ${bold ? 'font-medium' : ''}`}>—</span>;
  }

  if (keyName === 'attendanceSettings') {
    return <CompactKeyValue obj={value as Record<string, unknown>} bold={bold} />;
  }
  if (keyName === 'thumbnailKey') {
    return (
      <Image
        src={getFileFullUrl(value as string)}
        alt={t('thumbnailAlt')}
        width={100}
        height={100}
      />
    );
  }
  if (keyName === 'trailerKey') {
    return <Video url={getFileFullUrl(value as string)} withoutControls />;
  }
  if (keyName === 'pricing') {
    return <PricingComponent pricing={value as Pricing} />;
  }
  if (typeof value === 'boolean') {
    return (
      <span className={`wrap-break-word ${bold ? 'font-medium' : ''}`}>
        {value ? t('booleanLabels.yes') : t('booleanLabels.no')}
      </span>
    );
  }
  if (isPersonObject(value)) {
    return (
      <span
        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs ${bold ? 'font-medium' : ''}`}>
        {formatPersonName(value)}
      </span>
    );
  }
  if (isPersonArray(value)) {
    return (
      <div className="flex flex-wrap gap-1">
        {value.map((p, i) => (
          <span
            key={p._id ?? i}
            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs ${bold ? 'font-medium' : ''}`}>
            {formatPersonName(p)}
          </span>
        ))}
      </div>
    );
  }
  if (isNamedObjectArray(value)) {
    return (
      <div className="flex flex-wrap gap-1">
        {value.map((item, i) => (
          <span
            key={item._id ?? i}
            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs ${bold ? 'font-medium' : ''}`}>
            {item.name}
          </span>
        ))}
      </div>
    );
  }
  if (Array.isArray(value) && value.length === 0) {
    return <span className={`wrap-break-word ${bold ? 'font-medium' : ''}`}>—</span>;
  }
  if (Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-1">
        {value.map((item, i) => (
          <span
            key={i}
            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs ${bold ? 'font-medium' : ''}`}>
            {String(item)}
          </span>
        ))}
      </div>
    );
  }
  if (typeof value === 'object') {
    if (isAllNullish(value)) {
      return <span className="text-muted-foreground">—</span>;
    }
    return <CompactKeyValue obj={value as Record<string, unknown>} bold={bold} />;
  }

  return (
    <span className={`wrap-break-word ${bold ? 'font-medium' : ''}`}>
      {String(value as string | number)}
    </span>
  );
}

function PricingComponent({ pricing }: { pricing: Pricing }) {
  const t = useTranslations('CourseDataTable.billingCycles');
  const entries = Object.entries(pricing).filter(([, v]) => v?.originalPrice != null);

  if (entries.length === 0) return <span className="text-muted-foreground text-xs">—</span>;

  return (
    <div className="space-y-2 text-xs">
      {entries.map(([cycle, value]) => (
        <div key={cycle} className="space-y-0.5">
          <div className="flex items-baseline gap-1.5">
            <span className="text-muted-foreground capitalize">{t(cycle.toLowerCase())}:</span>
            <span className="font-medium">
              {value.originalPrice} {value.originalCurrency}
            </span>
            <span className="text-muted-foreground text-xs">
              {`${value.priceUSD?.toFixed(2)} ${Currency.USD}`}
            </span>
          </div>
          {value.discountPercentage ? (
            <div className="text-muted-foreground ps-3">
              {t('percentOff', { percent: value.discountPercentage })}
              {value.discountStartDate ? ` · ${formatDate(value.discountStartDate)}` : null}
              {value.discountEndDate ? ` – ${formatDate(value.discountEndDate)}` : null}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
