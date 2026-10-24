'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { CalendarDays, Plus, Trash2, Users } from 'lucide-react';
import { Link } from '@/i18n/navigation';
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
  ROUTE_ORG_ACADEMICS_GROUP_NEW,
  ROUTE_ORG_ACADEMICS_GROUPS,
} from '@/lib/data/constants/routes.constants';
import {
  useCohorts,
  useCreateCohort,
  useDeleteCohort,
} from '@/lib/hooks/academics/use-academics.hook';
import { CohortGroups } from './cohort-groups';
import { ConfirmButton } from './confirm-button';
import { StepHeader } from './step-header';

export function LevelCohorts({ levelId }: { levelId: string }) {
  const t = useTranslations('Academics');
  const locale = useLocale();
  const { data: cohorts = [] } = useCohorts(levelId);
  const createCohort = useCreateCohort();
  const deleteCohort = useDeleteCohort();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');

  const openDialog = (next: boolean) => {
    setOpen(next);
    if (next) {
      setName('');
      setStartDate('');
    }
  };

  return (
    <div className="space-y-3">
      <StepHeader
        step={3}
        icon={<CalendarDays className="size-4" />}
        title={t('programs.cohorts')}
        description={t('programs.cohortsHint')}
        count={cohorts.length}
        action={
          <Dialog open={open} onOpenChange={openDialog}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="size-4" />
                {t('programs.newCohort')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  createCohort.mutate(
                    { levelId, name, startDate },
                    { onSuccess: () => setOpen(false) }
                  );
                }}>
                <DialogHeader>
                  <DialogTitle>{t('programs.newCohort')}</DialogTitle>
                  <DialogDescription>{t('programs.cohortsHint')}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="cohort-name">{t('name')}</Label>
                    <Input
                      id="cohort-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t('programs.cohortNamePlaceholder')}
                      required
                      autoFocus
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="cohort-start">{t('startDate')}</Label>
                    <Input
                      id="cohort-start"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    {t('cancel')}
                  </Button>
                  <Button
                    type="submit"
                    disabled={!name.trim() || !startDate || createCohort.isPending}>
                    {t('create')}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {cohorts.length === 0 ? (
        <p className="text-muted-foreground rounded-md border border-dashed px-3 py-5 text-center text-sm">
          {t('programs.emptyCohortsHint')}
        </p>
      ) : null}

      <ul className="space-y-2">
        {cohorts.map((cohort) => (
          <li key={cohort._id} className="bg-muted/30 rounded-md border">
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{cohort.name}</p>
                <p className="text-muted-foreground flex items-center gap-1 text-xs">
                  <CalendarDays className="size-3" />
                  {new Date(cohort.startDate).toLocaleDateString(locale)}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button asChild variant="ghost" size="sm">
                  <Link href={`${ROUTE_ORG_ACADEMICS_GROUPS}?cohortId=${cohort._id}`}>
                    <Users className="size-4" />
                    <span className="hidden sm:inline">{t('programs.viewGroups')}</span>
                  </Link>
                </Button>
                <Button asChild variant="secondary" size="sm">
                  <Link href={ROUTE_ORG_ACADEMICS_GROUP_NEW(cohort._id)}>
                    <Plus className="size-4" />
                    <span className="hidden sm:inline">{t('programs.newGroup')}</span>
                  </Link>
                </Button>
                <ConfirmButton
                  variant="ghost"
                  size="sm"
                  description={t('programs.confirmDeleteCohortHint')}
                  onConfirm={() => deleteCohort.mutate(cohort._id)}>
                  <Trash2 className="size-4" />
                  <span className="sr-only">{t('delete')}</span>
                </ConfirmButton>
              </div>
            </div>
            <div className="border-t px-3 py-2.5">
              <p className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs font-medium">
                <Users className="size-3.5" />
                {t('groups.title')}
              </p>
              <CohortGroups cohortId={cohort._id} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
