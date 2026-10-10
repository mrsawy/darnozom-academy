'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { IconLoader2, IconPlus } from '@tabler/icons-react';
import { Button } from '@/components/atoms/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/atoms/dialog';
import {
  useAdminPlans,
  useCreatePlan,
  useUpdatePlan,
  useDeletePlan,
} from '@/lib/hooks/admin-plans/use-admin-plans.hook';
import { PlansTable } from './__components/plans-table';
import { PlanFormDialog } from './__components/plan-form-dialog';
import type { PlanFormValues } from './__components/plan-form.schema';
import type { PlanResponse } from '@/lib/actions/plan/plan.action';

export default function AdminPlansPage() {
  const t = useTranslations('AdminPlans');

  const { data: plans, isLoading } = useAdminPlans();
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();
  const deletePlan = useDeletePlan();

  const [formOpen, setFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanResponse | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<PlanResponse | null>(null);

  const handleCreate = useCallback(() => {
    setEditingPlan(null);
    setFormOpen(true);
  }, []);

  const handleEdit = useCallback((plan: PlanResponse) => {
    setEditingPlan(plan);
    setFormOpen(true);
  }, []);

  const handleFormSubmit = useCallback(
    async (values: PlanFormValues) => {
      await (editingPlan
        ? updatePlan.mutateAsync({ id: editingPlan._id, data: values })
        : createPlan.mutateAsync(values));
      setFormOpen(false);
      setEditingPlan(null);
    },
    [editingPlan, createPlan, updatePlan]
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingPlan) return;
    await deletePlan.mutateAsync(deletingPlan._id);
    setDeletingPlan(null);
  }, [deletingPlan, deletePlan]);

  const isSubmitting = createPlan.isPending || updatePlan.isPending;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        <Button onClick={handleCreate}>
          <IconPlus className="mr-2 h-4 w-4" />
          {t('createPlan')}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <IconLoader2 className="text-primary h-8 w-8 animate-spin" />
        </div>
      ) : plans && plans.length > 0 ? (
        <PlansTable plans={plans} onEdit={handleEdit} onDelete={setDeletingPlan} />
      ) : (
        <p className="text-muted-foreground py-12 text-center">{t('noPlans')}</p>
      )}

      {/* Create / Edit Dialog */}
      <PlanFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingPlan(null);
        }}
        plan={editingPlan}
        onSubmit={(values) => void handleFormSubmit(values)}
        isSubmitting={isSubmitting}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deletingPlan}
        onOpenChange={(open) => {
          if (!open) setDeletingPlan(null);
        }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteConfirm.title')}</DialogTitle>
            <DialogDescription>
              {t('deleteConfirm.description', { name: deletingPlan?.name ?? '' })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingPlan(null)}>
              {t('deleteConfirm.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDeleteConfirm()}
              disabled={deletePlan.isPending}>
              {deletePlan.isPending ? (
                <IconLoader2 className="h-4 w-4 animate-spin" />
              ) : (
                t('deleteConfirm.confirm')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
