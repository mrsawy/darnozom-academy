'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { IMessageTemplate } from '@darnozom/shared-types';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/atoms/dialog';
import { Button } from '@/components/atoms/button';
import { Label } from '@/components/atoms/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/atoms/select';
import { useMessageTemplates, useRenderTemplate } from '@/lib/hooks/message-template/use-message-template.hook';

interface SendTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  students: { _id: string; name: string }[];
}

export function SendTemplateDialog({ open, onOpenChange, groupId, students }: SendTemplateDialogProps) {
  const t = useTranslations('MessageTemplates');
  const { data: templates = [], isLoading } = useMessageTemplates(open);
  const render = useRenderTemplate();

  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');

  const selectedTemplate = templates.find((t) => t._id === selectedTemplateId) as IMessageTemplate | undefined;
  const needsStudent = selectedTemplate?.context === 'STUDENT';

  function handlePreview() {
    if (!selectedTemplateId) return;
    render.mutate({
      id: selectedTemplateId,
      data: {
        groupId,
        studentId: needsStudent ? selectedStudentId || undefined : undefined,
      },
    });
  }

  const result = render.data as import('@darnozom/shared-types').RenderTemplateResult | undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('sendDialog.title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t('sendDialog.template')}</Label>
            {isLoading ? (
              <p className="text-muted-foreground text-sm">{t('loading')}</p>
            ) : (
              <Select
                value={selectedTemplateId}
                onValueChange={(v) => {
                  setSelectedTemplateId(v);
                  render.reset();
                }}>
                <SelectTrigger>
                  <SelectValue placeholder={t('sendDialog.selectTemplate')} />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((tpl) => (
                    <SelectItem key={tpl._id} value={tpl._id}>
                      {tpl.name}
                      <span className="text-muted-foreground ml-2 text-xs">({tpl.context})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {needsStudent && (
            <div className="space-y-1.5">
              <Label>{t('sendDialog.student')}</Label>
              <Select
                value={selectedStudentId}
                onValueChange={(v) => {
                  setSelectedStudentId(v);
                  render.reset();
                }}>
                <SelectTrigger>
                  <SelectValue placeholder={t('sendDialog.selectStudent')} />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s._id} value={s._id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {result && (
            <div className="space-y-2">
              <Label>{t('sendDialog.preview')}</Label>
              <pre className="bg-muted rounded-md p-3 whitespace-pre-wrap text-sm font-mono">
                {result.text}
              </pre>
              {result.missingVariables.length > 0 && (
                <p className="text-destructive text-xs">
                  {t('sendDialog.missingVariables')}: {result.missingVariables.join(', ')}
                </p>
              )}
              {result.waLink && (
                <a
                  href={result.waLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-emerald-600 underline">
                  {t('sendDialog.openWhatsApp')}
                </a>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('close')}
          </Button>
          <Button
            onClick={handlePreview}
            disabled={
              render.isPending ||
              !selectedTemplateId ||
              (needsStudent && !selectedStudentId)
            }>
            {render.isPending ? t('sendDialog.rendering') : t('sendDialog.preview')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
