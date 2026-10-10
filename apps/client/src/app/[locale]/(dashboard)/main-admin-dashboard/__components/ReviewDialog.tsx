'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/atoms/dialog';
import { Button } from '@/components/atoms/button';
import { Textarea } from '@/components/atoms/textarea';
import { Label } from '@/components/atoms/label';
import { Switch } from '@/components/atoms/switch';
import { CoursePendingChangesDiff } from '@/components/organs/modals/course-pending-update-dialog/course-pending-update-dialog';

const FILE_KEY_FIELDS = new Set(['fileKey', 'thumbnailKey', 'trailerKey']);

interface ReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  onApprove: () => void;
  onReject: (comment: string, deleteFiles: boolean) => void;
  isApproving?: boolean;
  isRejecting?: boolean;
  pendingUpdate?: Record<string, unknown> | null;
  currentData?: Record<string, unknown>;
  /** Use course-specific diff (thumbnails, trailer, pricing, i18n labels from CourseDataTable). */
  coursePendingChanges?: boolean;
}

export function ReviewDialog({
  open,
  onOpenChange,
  itemName,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
  pendingUpdate,
  currentData,
  coursePendingChanges,
}: ReviewDialogProps) {
  const t = useTranslations('AdminDashboard');
  const [comment, setComment] = useState('');
  const [deleteFiles, setDeleteFiles] = useState(false);
  const isBusy = !!isApproving || !!isRejecting;

  useEffect(() => {
    if (open) {
      setComment('');
      setDeleteFiles(false);
    }
  }, [open]);

  const handleReject = () => {
    onReject(comment, deleteFiles);
  };

  const hasPendingChanges = !!(pendingUpdate && Object.keys(pendingUpdate).length > 0);
  const hasSubmittedSnapshot =
    !coursePendingChanges &&
    !hasPendingChanges &&
    !!currentData &&
    Object.keys(currentData).length > 0;

  const hasPendingFiles = useMemo(() => {
    if (pendingUpdate && Object.keys(pendingUpdate).some((key) => FILE_KEY_FIELDS.has(key))) {
      return true;
    }
    if (
      currentData &&
      !hasPendingChanges &&
      Object.entries(currentData).some(
        ([key, val]) => FILE_KEY_FIELDS.has(key) && typeof val === 'string' && val
      )
    ) {
      return true;
    }
    return false;
  }, [pendingUpdate, currentData, hasPendingChanges]);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!isBusy) onOpenChange(v);
      }}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('dialog.reviewTitle', { itemName })}</DialogTitle>
          <DialogDescription>
            {hasPendingChanges
              ? t('dialog.pendingChangesDescription')
              : t('dialog.defaultDescription')}
          </DialogDescription>
        </DialogHeader>

        {hasPendingChanges && currentData ? (
          coursePendingChanges ? (
            <CoursePendingChangesDiff currentData={currentData} pendingUpdate={pendingUpdate} />
          ) : (
            <PendingChangesView currentData={currentData} pendingUpdate={pendingUpdate} />
          )
        ) : null}

        {hasSubmittedSnapshot && currentData ? (
          <SubmittedContentSnapshot data={currentData} />
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="reject-comment">{t('dialog.rejectionCommentLabel')}</Label>
          <Textarea
            id="reject-comment"
            placeholder={t('dialog.rejectionCommentPlaceholder')}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            disabled={isBusy}
          />
        </div>

        {hasPendingFiles ? (
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="delete-files-switch" className="text-sm font-medium">
                {hasPendingChanges ? t('dialog.deleteFilesLabel') : t('dialog.deleteFilesNewLabel')}
              </Label>
              <p className="text-muted-foreground text-xs">
                {hasPendingChanges
                  ? t('dialog.deleteFilesDescription')
                  : t('dialog.deleteFilesNewDescription')}
              </p>
            </div>
            <Switch
              id="delete-files-switch"
              checked={deleteFiles}
              onCheckedChange={setDeleteFiles}
              disabled={isBusy}
            />
          </div>
        ) : null}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isBusy}>
            {t('buttons.cancel')}
          </Button>
          <Button variant="destructive" onClick={handleReject} disabled={isBusy || !comment.trim()}>
            {isRejecting ? t('buttons.rejecting') : t('buttons.reject')}
          </Button>
          <Button onClick={onApprove} disabled={isBusy}>
            {isApproving ? t('buttons.approving') : t('buttons.approve')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SubmittedContentSnapshot({ data }: { data: Record<string, unknown> }) {
  const t = useTranslations('AdminDashboard.dialog');
  const keys = Object.keys(data);

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <h4 className="text-sm font-medium">{t('submittedContent')}</h4>
      <div className="space-y-3 text-sm">
        {keys.map((key) => (
          <div key={key} className="bg-muted/50 rounded p-2">
            <span className="text-muted-foreground mb-1 block text-xs">{key}</span>
            <FormattedValue value={data[key]} />
          </div>
        ))}
      </div>
    </div>
  );
}

function PendingChangesView({
  currentData,
  pendingUpdate,
}: {
  currentData: Record<string, unknown>;
  pendingUpdate: Record<string, unknown>;
}) {
  const t = useTranslations('AdminDashboard.dialog');
  const changedKeys = Object.keys(pendingUpdate);

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <h4 className="text-sm font-medium">{t('proposedChanges')}</h4>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="text-muted-foreground font-medium">{t('current')}</div>
        <div className="text-muted-foreground font-medium">{t('proposed')}</div>
        {changedKeys.map((key) => (
          <div key={key} className="contents">
            <div className="bg-muted/50 rounded p-2">
              <span className="text-muted-foreground mb-1 block text-xs">{key}</span>
              <FormattedValue value={currentData[key]} />
            </div>
            <div className="rounded border border-green-200 bg-green-50 p-2 dark:border-green-800 dark:bg-green-950/20">
              <span className="text-muted-foreground mb-1 block text-xs">{key}</span>
              <FormattedValue value={pendingUpdate[key]} bold />
            </div>
          </div>
        ))}
      </div>
    </div>
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

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isArrayOfPlainObjects(v: unknown): v is Record<string, unknown>[] {
  return Array.isArray(v) && v.length > 0 && v.every(isPlainObject);
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

function PersonBadge({
  person,
  bold,
}: {
  person: { _id?: string; firstName: string; lastName: string; username?: string };
  bold?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs ${bold ? 'font-medium' : ''}`}>
      {formatPersonName(person)}
    </span>
  );
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
  const t = useTranslations('AdminDashboard');
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
              <span className="text-muted-foreground">{k}:</span>
              <CompactKeyValue obj={v as Record<string, unknown>} bold={bold} depth={depth + 1} />
            </div>
          );
        }
        if (Array.isArray(v)) {
          if (v.length === 0) {
            return (
              <div key={k} className="flex gap-1.5">
                <span className="text-muted-foreground shrink-0">{k}:</span>
                <span className="wrap-break-word">—</span>
              </div>
            );
          }
          if (isArrayOfPlainObjects(v)) {
            return (
              <div key={k} className="space-y-1">
                <span className="text-muted-foreground">{k}:</span>
                <div className="space-y-2 ps-2">
                  {v.map((row, idx) => (
                    <div key={idx} className="bg-background rounded border p-1.5">
                      <CompactKeyValue obj={row} bold={bold} depth={depth + 1} />
                    </div>
                  ))}
                </div>
              </div>
            );
          }
          const display = v.map(String).join(', ');
          return (
            <div key={k} className="flex gap-1.5">
              <span className="text-muted-foreground shrink-0">{k}:</span>
              <span className="wrap-break-word">{display}</span>
            </div>
          );
        }
        let display: string;
        if (typeof v === 'boolean') display = v ? t('booleanLabels.yes') : t('booleanLabels.no');
        else display = String(v);
        return (
          <div key={k} className="flex gap-1.5">
            <span className="text-muted-foreground shrink-0">{k}:</span>
            <span className="wrap-break-word">{display}</span>
          </div>
        );
      })}
    </div>
  );
}

function FormattedValue({ value, bold }: { value: unknown; bold?: boolean }) {
  const t = useTranslations('AdminDashboard');
  if (value === null || value === undefined) {
    return <span className={`wrap-break-word ${bold ? 'font-medium' : ''}`}>—</span>;
  }
  if (value instanceof Date) {
    return (
      <span className={`wrap-break-word ${bold ? 'font-medium' : ''}`}>{value.toISOString()}</span>
    );
  }
  if (typeof value === 'boolean') {
    return (
      <span className={`wrap-break-word ${bold ? 'font-medium' : ''}`}>
        {value ? t('booleanLabels.yes') : t('booleanLabels.no')}
      </span>
    );
  }
  if (isPersonObject(value)) {
    return <PersonBadge person={value} bold={bold} />;
  }
  if (isPersonArray(value)) {
    return (
      <div className="flex flex-wrap gap-1">
        {value.map((p, i) => (
          <PersonBadge key={p._id ?? i} person={p} bold={bold} />
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
  if (Array.isArray(value) && isArrayOfPlainObjects(value)) {
    return (
      <div className="space-y-2">
        {value.map((row, i) => (
          <div key={i} className={`bg-background rounded border p-2 ${bold ? 'font-medium' : ''}`}>
            <CompactKeyValue obj={row} bold={bold} />
          </div>
        ))}
      </div>
    );
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
