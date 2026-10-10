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
  useAdminAiPlans,
  useCreateAiPlan,
  useUpdateAiPlan,
  useDeleteAiPlan,
} from '@/lib/hooks/admin-ai-plans/use-admin-ai-plans.hook';
import { AiPlansTable } from './__components/ai-plans-table';
import { AiPlanFormDialog } from './__components/ai-plan-form-dialog';
import type { AiPlanFormValues } from './__components/ai-plan-form.schema';
import type { AiPlanResponse } from '@/lib/actions/ai-plan/ai-plan.action';

export default function AdminAiPlansPage() {
  const t = useTranslations('AdminAiPlans');

  const { data: plans, isLoading } = useAdminAiPlans();
  const createPlan = useCreateAiPlan();
  const updatePlan = useUpdateAiPlan();
  const deletePlan = useDeleteAiPlan();

  const [formOpen, setFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<AiPlanResponse | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<AiPlanResponse | null>(null);

  const handleCreate = useCallback(() => {
    setEditingPlan(null);
    setFormOpen(true);
  }, []);

  const handleEdit = useCallback((plan: AiPlanResponse) => {
    setEditingPlan(plan);
    setFormOpen(true);
  }, []);

  const handleFormSubmit = useCallback(
    async (values: AiPlanFormValues) => {
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
        <AiPlansTable plans={plans} onEdit={handleEdit} onDelete={setDeletingPlan} />
      ) : (
        <p className="text-muted-foreground py-12 text-center">{t('noPlans')}</p>
      )}

      <AiPlanFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingPlan(null);
        }}
        plan={editingPlan}
        onSubmit={(values) => void handleFormSubmit(values)}
        isSubmitting={isSubmitting}
      />

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
