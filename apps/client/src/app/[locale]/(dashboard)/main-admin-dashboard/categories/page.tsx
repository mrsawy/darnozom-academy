'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useDebounce } from '@/lib/hooks/use-debounce';
import {
  useActiveCategories,
  useAdminUpdateCategory,
  useAdminDeleteCategory,
  useAdminSetCategoryPublishStatus,
  useAdminSetCategoryActiveStatus,
  useApproveCategory,
  useRejectCategory,
} from '@/lib/hooks/admin-review/use-admin-review.hook';
import type { IReviewableCategory } from '@/lib/types/admin-review/admin-review.interface';
import { ApprovalStatusBadge } from '../__components/ApprovalStatusBadge';
import { PublishToggle } from '@/components/molecules/publish-toggle';
import { ActiveToggle } from '@/components/molecules/active-toggle';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Label } from '@/components/atoms/label';
import { Textarea } from '@/components/atoms/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/atoms/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/atoms/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/atoms/dropdown-menu';
import { IconSearch } from '@tabler/icons-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ReviewDialog } from '../__components/ReviewDialog';

export default function AdminActiveCategoriesPage() {
  const t = useTranslations('AdminActiveCategoriesPage');

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);

  const { data, isLoading, isError, refetch } = useActiveCategories({
    page,
    limit: 15,
    search: debouncedSearch || undefined,
  });

  const updateCategory = useAdminUpdateCategory();
  const deleteCategory = useAdminDeleteCategory();
  const setPublishStatus = useAdminSetCategoryPublishStatus();
  const setActiveStatus = useAdminSetCategoryActiveStatus();
  const approveCategory = useApproveCategory();
  const rejectCategory = useRejectCategory();

  // Edit dialog state
  const [editingCategory, setEditingCategory] = useState<IReviewableCategory | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '' });

  // Approve/reject review dialog state
  const [reviewingCategory, setReviewingCategory] = useState<IReviewableCategory | null>(null);

  const openEdit = (category: IReviewableCategory) => {
    setEditingCategory(category);
    setEditForm({ name: category.name, description: category.description ?? '' });
  };

  const handleSaveEdit = async () => {
    if (!editingCategory) return;
    await updateCategory.mutateAsync({ categoryId: editingCategory._id, data: editForm });
    setEditingCategory(null);
  };

  const handleDelete = (category: IReviewableCategory) => {
    if (!globalThis.confirm(t('deleteConfirm'))) return;
    void deleteCategory.mutateAsync(category._id);
  };

  const handleApprove = async () => {
    if (!reviewingCategory) return;
    await approveCategory.mutateAsync(reviewingCategory._id);
    setReviewingCategory(null);
  };

  const handleReject = async (comment: string, deleteFiles: boolean) => {
    if (!reviewingCategory) return;
    await rejectCategory.mutateAsync({
      itemId: reviewingCategory._id,
      comment,
      deleteFiles,
    });
    setReviewingCategory(null);
  };

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-medium">{t('title')}</h2>
          <p className="text-muted-foreground mt-1 text-sm">{t('description')}</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <IconSearch className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
        <Input
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="pl-8"
        />
      </div>

      {isError ? (
        <div className="space-y-2 py-8 text-center">
          <p className="text-destructive">{t('error')}</p>
          <Button size="sm" variant="outline" onClick={() => void refetch()}>
            {t('retry')}
          </Button>
        </div>
      ) : null}

      {!isError && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('name')}</TableHead>
                <TableHead>{t('description_col')}</TableHead>
                <TableHead>{t('organization')}</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead>{t('publishStatus')}</TableHead>
                <TableHead>{t('activeStatus')}</TableHead>
                <TableHead className="text-right">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}>
                          <div className="bg-muted h-4 animate-pulse rounded" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : (data?.docs ?? []).map((category) => (
                    <TableRow key={category._id}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell className="text-muted-foreground max-w-xs truncate">
                        {category.description ?? t('noDescription')}
                      </TableCell>
                      <TableCell>
                        {category.organization?.name ?? category.organizationId}
                      </TableCell>
                      <TableCell>
                        <ApprovalStatusBadge status={category.approvalStatus} />
                      </TableCell>
                      <TableCell>
                        <PublishToggle
                          publishStatus={category.publishStatus}
                          approvalStatus={category.approvalStatus}
                          isPending={setPublishStatus.isPending}
                          onToggle={(newStatus) =>
                            void setPublishStatus.mutateAsync({
                              categoryId: category._id,
                              publishStatus: newStatus,
                            })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <ActiveToggle
                          activeStatus={category.activeStatus}
                          isPending={setActiveStatus.isPending}
                          onToggle={(newStatus) =>
                            void setActiveStatus.mutateAsync({
                              categoryId: category._id,
                              activeStatus: newStatus,
                            })
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <span className="sr-only">{t('openMenu')}</span>⋮
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => openEdit(category)}>
                              {t('edit')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setReviewingCategory(category)}>
                              {t('approve')} / {t('reject')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => handleDelete(category)}>
                              {t('delete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <p className="text-muted-foreground text-sm">
          {t('total', { count: data?.totalDocs ?? 0 })}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={!data?.hasPrevPage}>
            <ChevronLeft className="h-4 w-4" />
            {t('previous')}
          </Button>
          <span className="text-muted-foreground text-sm">
            {t('pageOf', { page, totalPages: data?.totalPages ?? 1 })}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={!data?.hasNextPage}>
            {t('next')}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('editDialogTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-1.5 block">{t('categoryName')}</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder={t('categoryNamePlaceholder')}
              />
            </div>
            <div>
              <Label className="mb-1.5 block">{t('descriptionLabel')}</Label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder={t('descriptionPlaceholder')}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditingCategory(null)}>
              {t('cancel')}
            </Button>
            <Button
              onClick={() => void handleSaveEdit()}
              disabled={!editForm.name.trim() || updateCategory.isPending}>
              {t('saveChanges')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve / Reject dialog (reuses shared ReviewDialog) */}
      <ReviewDialog
        key={reviewingCategory?._id ?? 'closed'}
        open={!!reviewingCategory}
        onOpenChange={(open) => !open && setReviewingCategory(null)}
        itemName={reviewingCategory?.name ?? ''}
        onApprove={() => void handleApprove()}
        onReject={(comment, deleteFiles) => void handleReject(comment, deleteFiles)}
        isApproving={approveCategory.isPending}
        isRejecting={rejectCategory.isPending}
        pendingUpdate={reviewingCategory?.pendingUpdate}
        currentData={
          reviewingCategory
            ? { name: reviewingCategory.name, description: reviewingCategory.description }
            : undefined
        }
      />
    </div>
  );
}
