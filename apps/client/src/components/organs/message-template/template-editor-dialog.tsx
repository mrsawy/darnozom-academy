'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ALLOWED_VARIABLES } from '@darnozom/shared-types';
import type { IMessageTemplate, TemplateContext } from '@darnozom/shared-types';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/atoms/dialog';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Label } from '@/components/atoms/label';
import { Textarea } from '@/components/atoms/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/atoms/select';
import { Badge } from '@/components/atoms/badge';
import { useCreateTemplate, useUpdateTemplate } from '@/lib/hooks/message-template/use-message-template.hook';

export interface TemplateEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: IMessageTemplate | null;
}

export function TemplateEditorDialog({ open, onOpenChange, template }: TemplateEditorDialogProps) {
  const t = useTranslations('MessageTemplates');
  const create = useCreateTemplate();
  const update = useUpdateTemplate();

  const [name, setName] = useState('');
  const [context, setContext] = useState<TemplateContext>('STUDENT');
  const [body, setBody] = useState('');

  useEffect(() => {
    if (template) {
      setName(template.name);
      setContext(template.context);
      setBody(template.body);
    } else {
      setName('');
      setContext('STUDENT');
      setBody('');
    }
  }, [template, open]);

  const isEdit = Boolean(template);
  const isPending = create.isPending || update.isPending;
  const allowedVars = ALLOWED_VARIABLES[context];

  function handleSubmit() {
    if (!name.trim() || !body.trim()) return;
    if (isEdit && template) {
      update.mutate(
        { id: template._id, data: { name: name.trim(), body: body.trim() } },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      create.mutate(
        { name: name.trim(), context, body: body.trim() },
        { onSuccess: () => onOpenChange(false) },
      );
    }
  }

  function insertVariable(v: string) {
    setBody((prev) => `${prev}{{${v}}}`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('editTitle') : t('createTitle')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t('form.name')}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('form.namePlaceholder')}
            />
          </div>

          {!isEdit && (
            <div className="space-y-1.5">
              <Label>{t('form.context')}</Label>
              <Select value={context} onValueChange={(v) => setContext(v as TemplateContext)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STUDENT">{t('context.STUDENT')}</SelectItem>
                  <SelectItem value="GROUP">{t('context.GROUP')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>{t('form.body')}</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              placeholder={t('form.bodyPlaceholder')}
              className="font-mono text-sm"
            />
            <p className="text-muted-foreground text-xs">{t('form.variableHint')}</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">{t('form.availableVariables')}</Label>
            <div className="flex flex-wrap gap-1.5">
              {allowedVars.map((v) => (
                <Badge
                  key={v}
                  variant="outline"
                  className="cursor-pointer text-xs hover:bg-accent"
                  onClick={() => insertVariable(v)}>
                  {`{{${v}}}`}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !name.trim() || !body.trim()}>
            {isPending ? t('saving') : t('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
