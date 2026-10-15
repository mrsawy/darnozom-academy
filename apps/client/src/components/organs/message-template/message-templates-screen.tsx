'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { IMessageTemplate } from '@darnozom/shared-types';
import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/atoms/table';
import { useMessageTemplates, useDeleteTemplate } from '@/lib/hooks/message-template/use-message-template.hook';
import { TemplateEditorDialog } from './template-editor-dialog';

export function MessageTemplatesScreen() {
  const t = useTranslations('MessageTemplates');
  const { data: templates = [], isLoading } = useMessageTemplates();
  const deleteTemplate = useDeleteTemplate();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<IMessageTemplate | null>(null);

  function openCreate() {
    setEditing(null);
    setEditorOpen(true);
  }

  function openEdit(tpl: IMessageTemplate) {
    setEditing(tpl);
    setEditorOpen(true);
  }

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('pageTitle')}</h1>
          <p className="text-muted-foreground text-sm">{t('pageSubtitle')}</p>
        </div>
        <Button onClick={openCreate}>{t('createButton')}</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('listTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">{t('loading')}</p>
          ) : templates.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-muted-foreground text-sm">{t('empty')}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={openCreate}>
                {t('createButton')}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('table.name')}</TableHead>
                  <TableHead>{t('table.context')}</TableHead>
                  <TableHead>{t('table.body')}</TableHead>
                  <TableHead>{t('table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((tpl) => (
                  <TableRow key={tpl._id}>
                    <TableCell className="font-medium">{tpl.name}</TableCell>
                    <TableCell>
                      <Badge variant={tpl.context === 'STUDENT' ? 'default' : 'outline'}>
                        {t(`context.${tpl.context}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                      {tpl.body}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(tpl)}>
                          {t('table.edit')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          disabled={deleteTemplate.isPending}
                          onClick={() => deleteTemplate.mutate(tpl._id)}>
                          {t('table.delete')}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <TemplateEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        template={editing}
      />
    </div>
  );
}
