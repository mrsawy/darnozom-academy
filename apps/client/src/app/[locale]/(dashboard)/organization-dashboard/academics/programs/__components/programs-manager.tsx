'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronLeft, Network, Plus, Trash2 } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/atoms/button';
import { Card, CardContent } from '@/components/atoms/card';
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
import { Textarea } from '@/components/atoms/textarea';
import { ROUTE_ORG_ACADEMICS_PROGRAM } from '@/lib/data/constants/routes.constants';
import {
  useCreateProgram,
  useDeleteProgram,
  usePrograms,
} from '@/lib/hooks/academics/use-academics.hook';
import { ConfirmButton } from '../[id]/__components/confirm-button';

export function ProgramsManager() {
  const t = useTranslations('Academics');
  const { data: programs = [], isLoading } = usePrograms();
  const createProgram = useCreateProgram();
  const deleteProgram = useDeleteProgram();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const openDialog = (next: boolean) => {
    setOpen(next);
    if (next) {
      setName('');
      setDescription('');
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('programs.title')}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t('programs.listHint')}</p>
        </div>
        <Dialog open={open} onOpenChange={openDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" />
              {t('programs.new')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                createProgram.mutate(
                  { name, description: description.trim() || undefined },
                  { onSuccess: () => setOpen(false) }
                );
              }}>
              <DialogHeader>
                <DialogTitle>{t('programs.new')}</DialogTitle>
                <DialogDescription>{t('programs.newHint')}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="program-name">{t('name')}</Label>
                  <Input
                    id="program-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('programs.namePlaceholder')}
                    required
                    autoFocus
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="program-description">{t('description')}</Label>
                  <Textarea
                    id="program-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t('programs.descriptionPlaceholder')}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  {t('cancel')}
                </Button>
                <Button type="submit" disabled={!name.trim() || createProgram.isPending}>
                  {t('create')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? <p className="text-muted-foreground text-sm">{t('loading')}</p> : null}

      {!isLoading && programs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <span className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
              <Network className="size-6" />
            </span>
            <p className="font-medium">{t('programs.emptyTitle')}</p>
            <p className="text-muted-foreground max-w-sm text-sm">{t('programs.emptyHint')}</p>
          </CardContent>
        </Card>
      ) : null}

      <ul className="grid gap-3 md:grid-cols-2">
        {programs.map((program) => (
          <li key={program._id}>
            <Card className="hover:border-primary/40 group h-full transition-colors">
              <CardContent className="flex h-full items-start justify-between gap-3">
                <Link
                  href={ROUTE_ORG_ACADEMICS_PROGRAM(program._id)}
                  className="flex min-w-0 flex-1 items-start gap-3">
                  <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
                    <Network className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="group-hover:text-primary block truncate font-medium transition-colors">
                      {program.name}
                    </span>
                    {program.description ? (
                      <span className="text-muted-foreground line-clamp-2 block text-sm">
                        {program.description}
                      </span>
                    ) : null}
                  </span>
                  <ChevronLeft className="text-muted-foreground mt-2.5 size-4 shrink-0 rtl:rotate-180" />
                </Link>
                <ConfirmButton
                  variant="ghost"
                  size="sm"
                  description={t('programs.confirmDeleteHint')}
                  onConfirm={() => deleteProgram.mutate(program._id)}>
                  <Trash2 className="size-4" />
                  <span className="sr-only">{t('delete')}</span>
                </ConfirmButton>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
