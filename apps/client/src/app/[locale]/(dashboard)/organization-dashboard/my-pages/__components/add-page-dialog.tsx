'use client';

import React, { useState } from 'react';
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
import { Checkbox } from '@/components/atoms/checkbox';
import { IconPlus, IconCheck } from '@tabler/icons-react';
import { useCreatePage } from '@/lib/hooks/page/page.hook';
import useGeneralStore from '@/lib/store/generalStore';
import { useTranslations } from 'next-intl';
import { PAGE_TEMPLATES, getTemplateById } from '../__templates/templates';
import type { AddPageDialogProps } from './add-page-dialog.types';

function AddPageDialog({ addDisabled = false, addDisabledTitle }: AddPageDialogProps) {
  const t = useTranslations('AddPageDialog');
  const [open, setOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('blank');
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    published: false,
  });

  const createPageMutation = useCreatePage();

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    const slug = title
      .toLowerCase()
      .replaceAll(/[^a-z0-9]+/g, '-')
      .replaceAll(/^-+|-+$/g, '');

    setFormData({ ...formData, title, slug });
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const slug = e.target.value
      .toLowerCase()
      .replaceAll(/[^a-z0-9-]/g, '')
      .replaceAll(/^-+|-+$/g, '');

    setFormData({ ...formData, slug });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.slug.trim()) {
      return;
    }

    useGeneralStore.setState({ generalIsLoading: true });

    try {
      const template = getTemplateById(selectedTemplateId);
      const pageData = template
        ? {
            ...template.data,
            root: {
              ...template.data.root,
              props: {
                ...template.data.root?.props,
                title: formData.title,
              },
            },
          }
        : {};

      await createPageMutation.mutateAsync({
        title: formData.title,
        slug: formData.slug,
        published: formData.published,
        pageData: pageData as Record<string, unknown>,
      });

      setFormData({ title: '', slug: '', published: false });
      setSelectedTemplateId('blank');
      setOpen(false);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error creating page:', error);
    } finally {
      useGeneralStore.setState({ generalIsLoading: false });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={addDisabled} title={addDisabledTitle}>
          <IconPlus className="h-4 w-4" />
          {t('addNewPage')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[860px]">
        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}>
          <DialogHeader>
            <DialogTitle>{t('createNewPage')}</DialogTitle>
            <DialogDescription>{t('description')}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="space-y-3">
              <Label className="text-sm font-semibold">{t('chooseTemplate')}</Label>
              <p className="text-xs opacity-70">{t('chooseTemplateHint')}</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {PAGE_TEMPLATES.map((tpl) => {
                  const selected = selectedTemplateId === tpl.id;
                  return (
                    <button
                      type="button"
                      key={tpl.id}
                      onClick={() => setSelectedTemplateId(tpl.id)}
                      className={`group relative flex flex-col overflow-hidden rounded-lg border text-left transition-all focus:outline-none ${
                        selected
                          ? 'border-primary ring-primary/30 ring-2'
                          : 'border-border hover:border-primary/60'
                      }`}>
                      <div className="bg-muted relative aspect-video w-full overflow-hidden">
                        {tpl.preview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={tpl.preview}
                            alt={tpl.title}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs opacity-60">
                            {t('blankPreview')}
                          </div>
                        )}
                        {selected ? (
                          <span className="bg-primary text-primary-foreground absolute top-2 right-2 rounded-full p-1 shadow">
                            <IconCheck className="h-3 w-3" />
                          </span>
                        ) : null}
                      </div>
                      <div className="p-2">
                        <div className="truncate text-xs font-semibold">{tpl.title}</div>
                        <div className="mt-0.5 line-clamp-2 text-[11px] opacity-70">
                          {tpl.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">
                  {t('pageTitle')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder={t('enterPageTitle')}
                  value={formData.title}
                  onChange={handleTitleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">
                  {t('slug')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="slug"
                  placeholder={t('pageSlugPlaceholder')}
                  value={formData.slug}
                  onChange={handleSlugChange}
                  required
                />
                <p className="text-xs opacity-70">
                  {t('url', { slug: formData.slug || t('pageSlugPlaceholder') })}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="published"
                checked={formData.published}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, published: checked as boolean })
                }
              />
              <Label htmlFor="published" className="cursor-pointer text-sm font-normal">
                {t('publishImmediately')}
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={!formData.title.trim() || !formData.slug.trim()}>
              {t('createPage')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default AddPageDialog;
