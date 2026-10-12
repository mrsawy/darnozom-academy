'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import {
  ROUTE_ORG_ACADEMICS_GROUP_NEW,
  ROUTE_ORG_ACADEMICS_GROUPS,
} from '@/lib/data/constants/routes.constants';
import {
  useCohorts,
  useCreateCohort,
  useDeleteCohort,
} from '@/lib/hooks/academics/use-academics.hook';

export function LevelCohorts({ levelId }: { levelId: string }) {
  const t = useTranslations('Academics');
  const locale = useLocale();
  const { data: cohorts = [] } = useCohorts(levelId);
  const createCohort = useCreateCohort();
  const deleteCohort = useDeleteCohort();
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');

  return (
    <div className="space-y-2">
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          createCohort.mutate({ levelId, name, startDate }, { onSuccess: () => setName('') });
        }}>
        <Input
          className="w-48"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('name')}
          required
        />
        <Input
          className="w-44"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          aria-label={t('startDate')}
          required
        />
        <Button
          type="submit"
          size="sm"
          variant="secondary"
          disabled={!name.trim() || !startDate || createCohort.isPending}>
          {t('programs.newCohort')}
        </Button>
      </form>
      <ul className="space-y-1">
        {cohorts.map((cohort) => (
          <li key={cohort._id} className="flex flex-wrap items-center gap-3 text-sm">
            <span>{`${cohort.name} — ${new Date(cohort.startDate).toLocaleDateString(locale)}`}</span>
            <Link
              className="underline"
              href={`${ROUTE_ORG_ACADEMICS_GROUPS}?cohortId=${cohort._id}`}>
              {t('programs.viewGroups')}
            </Link>
            <Link className="underline" href={ROUTE_ORG_ACADEMICS_GROUP_NEW(cohort._id)}>
              {t('programs.newGroup')}
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (globalThis.confirm(t('confirmDelete'))) deleteCohort.mutate(cohort._id);
              }}>
              {t('delete')}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
