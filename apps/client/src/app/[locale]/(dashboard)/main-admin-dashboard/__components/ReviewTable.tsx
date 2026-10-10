'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/atoms/table';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Checkbox } from '@/components/atoms/checkbox';
import { Textarea } from '@/components/atoms/textarea';
import { Label } from '@/components/atoms/label';
import { Switch } from '@/components/atoms/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/atoms/dialog';
import { IconSearch, IconTrash, IconCheck, IconX } from '@tabler/icons-react';
import { ApprovalStatusBadge } from './ApprovalStatusBadge';
import { ReviewDialog } from './ReviewDialog';
import type { IReviewableItem } from '@/lib/types/admin-review/admin-review.interface';
import type { Paginated } from '@/lib/types/Paginated';

interface Column<T> {
  header: string;
  accessor: (item: T) => React.ReactNode;
}

interface ReviewTableProps<T extends IReviewableItem> {
  data: Paginated<T> | undefined;
  columns: Column<T>[];
  nameAccessor: (item: T) => string;
  currentDataAccessor?: (item: T) => Record<string, unknown>;
  /** When true, pending field diffs use the course pending-update UI (media, pricing, labels). */
  coursePendingChanges?: boolean;
  onApprove: (itemId: string) => Promise<unknown>;
  onReject: (itemId: string, comment: string, deleteFiles: boolean) => Promise<unknown>;
  isApproving?: boolean;
  isRejecting?: boolean;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  page: number;
  onPageChange: (page: number) => void;
  search?: string;
  onSearchChange?: (value: string) => void;
  // Bulk action props (all optional — omitting them hides the bulk toolbar)
  onBulkApprove?: (ids: string[]) => Promise<unknown>;
  onBulkReject?: (ids: string[], comment: string, deleteFiles: boolean) => Promise<unknown>;
  onBulkDelete?: (ids: string[]) => Promise<unknown>;
  isBulkApproving?: boolean;
  isBulkRejecting?: boolean;
  isBulkDeleting?: boolean;
}

export function ReviewTable<T extends IReviewableItem>({
  data,
  columns,
  nameAccessor,
  currentDataAccessor,
  coursePendingChanges,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
  isLoading,
  isError,
  onRetry,
  page,
  onPageChange,
  search,
  onSearchChange,
  onBulkApprove,
  onBulkReject,
  onBulkDelete,
  isBulkApproving,
  isBulkRejecting,
  isBulkDeleting,
}: ReviewTableProps<T>) {
  const t = useTranslations('AdminDashboard');
  const [selectedItem, setSelectedItem] = useState<T | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const hasBulkActions = !!(onBulkApprove ?? onBulkReject ?? onBulkDelete);

  // Clear selection only when the page number changes (not on background refetches)
  useEffect(() => {
    setSelectedIds(new Set());
  }, [page]);

  const allPageIds = useMemo(() => data?.docs.map((item) => item._id) ?? [], [data]);
  const allSelected = allPageIds.length > 0 && allPageIds.every((id) => selectedIds.has(id));
  const someSelected = allPageIds.some((id) => selectedIds.has(id)) && !allSelected;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        allPageIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        allPageIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleApprove = async () => {
    if (!selectedItem) return;
    try {
      await onApprove(selectedItem._id);
      setSelectedItem(null);
    } catch {
      // error is handled by the mutation's onError callback
    }
  };

  const handleReject = async (comment: string, deleteFiles: boolean) => {
    if (!selectedItem) return;
    try {
      await onReject(selectedItem._id, comment, deleteFiles);
      setSelectedItem(null);
    } catch {
      // error is handled by the mutation's onError callback
    }
  };

  const handleBulkApprove = async () => {
    if (!onBulkApprove) return;
    const ids = [...selectedIds];
    try {
      await onBulkApprove(ids);
      setSelectedIds(new Set());
    } catch {
      // error is handled by the mutation's onError callback
    }
  };

  const handleBulkDelete = async () => {
    if (!onBulkDelete) return;
    const ids = [...selectedIds];
    try {
      await onBulkDelete(ids);
      setBulkDeleteOpen(false);
      setSelectedIds(new Set());
    } catch {
      // error is handled by the mutation's onError callback
    }
  };

  const isBulkBusy =
    (isBulkApproving ?? false) || (isBulkRejecting ?? false) || (isBulkDeleting ?? false);

  const searchInput = onSearchChange ? (
    <div className="relative max-w-sm">
      <IconSearch className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
      <Input
        placeholder={t('searchPlaceholder')}
        value={search ?? ''}
        onChange={(e) => onSearchChange(e.target.value)}
        className="pl-8"
      />
    </div>
  ) : null;

  if (isLoading) {
    return (
      <>
        {searchInput}
        <div className="text-muted-foreground py-8 text-center">{t('emptyStates.loading')}</div>
      </>
    );
  }

  if (isError) {
    return (
      <>
        {searchInput}
        <div className="space-y-2 py-8 text-center">
          <p className="text-destructive">{t('emptyStates.failedToLoadItems')}</p>
          {onRetry ? (
            <Button size="sm" variant="outline" onClick={onRetry}>
              {t('retry')}
            </Button>
          ) : null}
        </div>
      </>
    );
  }

  if (!data || data.docs.length === 0) {
    return (
      <>
        {searchInput}
        <div className="text-muted-foreground py-8 text-center">
          {t('emptyStates.noItemsToReview')}
        </div>
      </>
    );
  }

  const selectedCount = selectedIds.size;

  return (
    <>
      <div className="flex items-center justify-between gap-4">{searchInput}</div>

      {hasBulkActions && selectedCount > 0 ? (
        <div className="bg-muted/50 flex flex-wrap items-center gap-2 rounded-md border px-4 py-2">
          <span className="text-muted-foreground text-sm font-medium">
            {t('bulkActions.selected', { count: selectedCount })}
          </span>
          <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
            {onBulkApprove ? (
              <Button size="sm" onClick={() => void handleBulkApprove()} disabled={isBulkBusy}>
                <IconCheck className="mr-1 h-4 w-4" />
                {isBulkApproving ? t('buttons.approving') : t('bulkActions.approveSelected')}
              </Button>
            ) : null}
            {onBulkReject ? (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setBulkRejectOpen(true)}
                disabled={isBulkBusy}>
                <IconX className="mr-1 h-4 w-4" />
                {t('bulkActions.rejectSelected')}
              </Button>
            ) : null}
            {onBulkDelete ? (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setBulkDeleteOpen(true)}
                disabled={isBulkBusy}>
                <IconTrash className="mr-1 h-4 w-4" />
                {t('bulkActions.deleteSelected')}
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds(new Set())}
              disabled={isBulkBusy}>
              {t('bulkActions.clearSelection')}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {hasBulkActions ? (
                <TableHead className="w-10">
                  <Checkbox
                    checked={someSelected ? 'indeterminate' : allSelected}
                    onCheckedChange={toggleAll}
                    aria-label={t('reviews.selectAll')}
                    className="mx-3"
                  />
                </TableHead>
              ) : null}
              {columns.map((col) => (
                <TableHead key={col.header}>{col.header}</TableHead>
              ))}
              <TableHead>{t('table.status')}</TableHead>
              <TableHead className="text-right">{t('table.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.docs.map((item) => (
              <TableRow
                key={item._id}
                data-state={selectedIds.has(item._id) ? 'selected' : undefined}>
                {hasBulkActions ? (
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(item._id)}
                      onCheckedChange={() => toggleRow(item._id)}
                      aria-label={`Select ${nameAccessor(item)}`}
                      className="mx-3"
                    />
                  </TableCell>
                ) : null}
                {columns.map((col) => (
                  <TableCell key={col.header}>{col.accessor(item)}</TableCell>
                ))}
                <TableCell>
                  <ApprovalStatusBadge status={item.approvalStatus} />
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" onClick={() => setSelectedItem(item)}>
                    {t('buttons.review')}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between pt-4">
        <p className="text-muted-foreground text-sm">
          {t('pagination', {
            page: data.page,
            totalPages: data.totalPages,
            totalDocs: data.totalDocs,
          })}
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!data.hasPrevPage}
            onClick={() => onPageChange(page - 1)}>
            {t('buttons.previous')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!data.hasNextPage}
            onClick={() => onPageChange(page + 1)}>
            {t('buttons.next')}
          </Button>
        </div>
      </div>

      {/* Single-item review dialog */}
      <ReviewDialog
        key={selectedItem?._id ?? 'closed'}
        open={!!selectedItem}
        onOpenChange={(open) => !open && setSelectedItem(null)}
        itemName={selectedItem ? nameAccessor(selectedItem) : ''}
        onApprove={() => void handleApprove()}
        onReject={(comment, deleteFiles) => void handleReject(comment, deleteFiles)}
        isApproving={isApproving}
        isRejecting={isRejecting}
        pendingUpdate={selectedItem?.pendingUpdate}
        currentData={selectedItem ? currentDataAccessor?.(selectedItem) : undefined}
        coursePendingChanges={coursePendingChanges}
      />

      {/* Bulk reject dialog */}
      {onBulkReject ? (
        <BulkRejectDialog
          open={bulkRejectOpen}
          onOpenChange={setBulkRejectOpen}
          count={selectedCount}
          onConfirm={async (comment, deleteFiles) => {
            try {
              await onBulkReject([...selectedIds], comment, deleteFiles);
              setBulkRejectOpen(false);
              setSelectedIds(new Set());
            } catch {
              // error is handled by the mutation's onError callback
            }
          }}
          isRejecting={!!isBulkRejecting}
        />
      ) : null}

      {/* Bulk delete confirmation dialog */}
      {onBulkDelete ? (
        <BulkDeleteDialog
          open={bulkDeleteOpen}
          onOpenChange={setBulkDeleteOpen}
          count={selectedCount}
          onConfirm={() => void handleBulkDelete()}
          isDeleting={!!isBulkDeleting}
        />
      ) : null}
    </>
  );
}

// ─── BulkRejectDialog ───────────────────────────────────────────────

interface BulkRejectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  count: number;
  onConfirm: (comment: string, deleteFiles: boolean) => Promise<void>;
  isRejecting: boolean;
}

function BulkRejectDialog({
  open,
  onOpenChange,
  count,
  onConfirm,
  isRejecting,
}: BulkRejectDialogProps) {
  const t = useTranslations('AdminDashboard');
  const [comment, setComment] = useState('');
  const [deleteFiles, setDeleteFiles] = useState(false);

  useEffect(() => {
    if (open) {
      setComment('');
      setDeleteFiles(false);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(v) => !isRejecting && onOpenChange(v)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('bulkActions.rejectDialog.title', { count })}</DialogTitle>
          <DialogDescription>{t('bulkActions.rejectDialog.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="bulk-reject-comment">{t('bulkActions.rejectDialog.commentLabel')}</Label>
          <Textarea
            id="bulk-reject-comment"
            placeholder={t('bulkActions.rejectDialog.commentPlaceholder')}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            disabled={isRejecting}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="space-y-0.5">
            <Label htmlFor="bulk-delete-files-switch" className="text-sm font-medium">
              {t('bulkActions.rejectDialog.deleteFilesLabel')}
            </Label>
            <p className="text-muted-foreground text-xs">
              {t('bulkActions.rejectDialog.deleteFilesDescription')}
            </p>
          </div>
          <Switch
            id="bulk-delete-files-switch"
            checked={deleteFiles}
            onCheckedChange={setDeleteFiles}
            disabled={isRejecting}
          />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isRejecting}>
            {t('bulkActions.rejectDialog.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={() => void onConfirm(comment, deleteFiles)}
            disabled={isRejecting || !comment.trim()}>
            {isRejecting
              ? t('bulkActions.rejectDialog.rejecting')
              : t('bulkActions.rejectDialog.confirmReject')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── BulkDeleteDialog ───────────────────────────────────────────────

interface BulkDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  count: number;
  onConfirm: () => void;
  isDeleting: boolean;
}

function BulkDeleteDialog({
  open,
  onOpenChange,
  count,
  onConfirm,
  isDeleting,
}: BulkDeleteDialogProps) {
  const t = useTranslations('AdminDashboard');

  return (
    <Dialog open={open} onOpenChange={(v) => !isDeleting && onOpenChange(v)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('bulkActions.confirmDelete.title')}</DialogTitle>
          <DialogDescription>
            {t('bulkActions.confirmDelete.description', { count })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            {t('bulkActions.confirmDelete.cancel')}
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
            {t('bulkActions.confirmDelete.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
