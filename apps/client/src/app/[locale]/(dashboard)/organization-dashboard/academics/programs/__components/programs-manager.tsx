'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { Input } from '@/components/atoms/input';
import { ROUTE_ORG_ACADEMICS_PROGRAM } from '@/lib/data/constants/routes.constants';
import {
  useCreateProgram,
  useDeleteProgram,
  usePrograms,
} from '@/lib/hooks/academics/use-academics.hook';

export function ProgramsManager() {
  const t = useTranslations('Academics');
  const { data: programs = [], isLoading } = usePrograms();
  const createProgram = useCreateProgram();
  const deleteProgram = useDeleteProgram();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  let list = <p className="text-muted-foreground">{t('empty')}</p>;
  if (isLoading) list = <p>{t('loading')}</p>;
  else if (programs.length > 0) {
    list = (
      <ul className="grid gap-3 md:grid-cols-2">
        {programs.map((program) => (
          <li key={program._id}>
            <Card>
              <CardContent className="flex items-center justify-between gap-3 pt-6">
                <Link
                  href={ROUTE_ORG_ACADEMICS_PROGRAM(program._id)}
                  className="font-medium hover:underline">
                  {program.name}
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (globalThis.confirm(t('confirmDelete'))) deleteProgram.mutate(program._id);
                  }}>
                  {t('delete')}
                </Button>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <h1 className="text-2xl font-semibold">{t('programs.title')}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{t('programs.new')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-3 md:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              createProgram.mutate(
                { name, description: description.trim() || undefined },
                {
                  onSuccess: () => {
                    setName('');
                    setDescription('');
                  },
                }
              );
            }}>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('name')}
              required
            />
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('description')}
            />
            <Button type="submit" disabled={!name.trim() || createProgram.isPending}>
              {t('create')}
            </Button>
          </form>
        </CardContent>
      </Card>
      {list}
    </div>
  );
}
