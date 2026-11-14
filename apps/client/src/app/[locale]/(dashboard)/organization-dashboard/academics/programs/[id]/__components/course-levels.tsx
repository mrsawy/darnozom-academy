'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Award, Layers, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/atoms/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/atoms/dialog';
import { Input } from '@/components/atoms/input';
import { Label } from '@/components/atoms/label';
import {
  useCreateLevel,
  useDeleteLevel,
  useLevels,
  useUpdateLevel,
} from '@/lib/hooks/academics/use-academics.hook';
import { EditFieldsDialog } from './edit-fields-dialog/edit-fields-dialog';
import { AgeRangeSelect } from './age-range-select';
import { LevelCohorts } from './level-cohorts';
import { ConfirmButton } from './confirm-button';
import { StepHeader } from './step-header';
import { LevelCertificateRulesModal } from '@/components/organs/certificate/level-certificate-rules-modal';
import type { ILevel } from '@/lib/types/academics/academics';

export function CourseLevels({ courseId }: { courseId: string }) {
  const t = useTranslations('Academics');
  const tCert = useTranslations('Certificates');
  const { data: levels = [] } = useLevels(courseId);
  const createLevel = useCreateLevel();
  const deleteLevel = useDeleteLevel();
  const updateLevel = useUpdateLevel();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [order, setOrder] = useState('');
  const [ageRangeId, setAgeRangeId] = useState<string | null>(null);
  const [editingRulesLevel, setEditingRulesLevel] = useState<ILevel | null>(null);

  const nextOrder = String(levels.length + 1);

  const openDialog = (next: boolean) => {
    setOpen(next);
    if (next) {
      setName('');
      setOrder(nextOrder);
      setAgeRangeId(null);
    }
  };

  return (
    <div className="space-y-4">
      <StepHeader
        step={2}
        icon={<Layers className="size-4" />}
        title={t('programs.levels')}
        description={t('programs.levelsHint')}
        count={levels.length}
        action={
          <Dialog open={open} onOpenChange={openDialog}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="size-4" />
                {t('programs.newLevel')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  createLevel.mutate(
                    { courseId, name, order: Number(order), ...(ageRangeId ? { ageRangeId } : {}) },
                    { onSuccess: () => setOpen(false) }
                  );
                }}>
                <DialogHeader>
                  <DialogTitle>{t('programs.newLevel')}</DialogTitle>
                  <DialogDescription>{t('programs.levelsHint')}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="level-name">{t('name')}</Label>
                    <Input
                      id="level-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t('programs.levelNamePlaceholder')}
                      required
                      autoFocus
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="level-order">{t('order')}</Label>
                    <Input
                      id="level-order"
                      type="number"
                      min={1}
                      value={order}
                      onChange={(e) => setOrder(e.target.value)}
                      required
                    />
                    <p className="text-muted-foreground text-xs">{t('programs.orderHint')}</p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="level-age-range">{t('ageRange')}</Label>
                    <AgeRangeSelect id="level-age-range" value={ageRangeId} onChange={setAgeRangeId} />
                    <p className="text-muted-foreground text-xs">{t('programs.ageRangeHint')}</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    {t('cancel')}
                  </Button>
                  <Button type="submit" disabled={!name.trim() || createLevel.isPending}>
                    {t('create')}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {levels.length === 0 ? (
        <div className="text-muted-foreground rounded-lg border border-dashed px-4 py-8 text-center text-sm">
          {t('programs.emptyLevelsHint')}
        </div>
      ) : null}

      <div className="space-y-3">
        {levels.map((level) => (
          <div key={level._id} className="bg-card rounded-lg border">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-md text-sm font-semibold">
                  {level.order}
                </span>
                <span className="truncate font-medium">{level.name}</span>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <AgeRangeSelect
                  value={level.ageRangeId}
                  disabled={updateLevel.isPending}
                  className="h-8 w-40 text-xs"
                  onChange={(next) => updateLevel.mutate({ id: level._id, data: { ageRangeId: next } })}
                />
                <EditFieldsDialog
                  triggerLabel={t('programs.editLevel')}
                  title={t('programs.editLevel')}
                  description={t('programs.orderHint')}
                  fields={[
                    { name: 'name', label: t('name'), type: 'text', required: true },
                    { name: 'order', label: t('order'), type: 'number', required: true, min: 1 },
                  ]}
                  values={{ name: level.name, order: String(level.order) }}
                  pending={updateLevel.isPending}
                  onSave={(v, close) =>
                    updateLevel.mutate(
                      { id: level._id, data: { name: v.name, order: Number(v.order) } },
                      { onSuccess: close }
                    )
                  }
                />
                <Button variant="ghost" size="sm" onClick={() => setEditingRulesLevel(level)}>
                  <Award className="size-4" />
                  <span className="hidden sm:inline">{tCert('rules.button')}</span>
                </Button>
                <ConfirmButton
                  variant="ghost"
                  size="sm"
                  description={t('programs.confirmDeleteLevelHint')}
                  onConfirm={() => deleteLevel.mutate(level._id)}>
                  <Trash2 className="size-4" />
                  <span className="sr-only">{t('delete')}</span>
                </ConfirmButton>
              </div>
            </div>
            <div className="border-t px-4 py-4">
              <LevelCohorts levelId={level._id} />
            </div>
          </div>
        ))}
      </div>

      {editingRulesLevel && (
        <LevelCertificateRulesModal
          levelId={editingRulesLevel._id}
          levelName={editingRulesLevel.name}
          rules={editingRulesLevel.certificateRules}
          open={Boolean(editingRulesLevel)}
          onOpenChange={(isOpen) => {
            if (!isOpen) setEditingRulesLevel(null);
          }}
        />
      )}
    </div>
  );
}
