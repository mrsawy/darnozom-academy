'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Pencil } from 'lucide-react';
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
import type { EditField, EditFieldValues } from './edit-fields-dialog.schema';

interface EditFieldsDialogProps {
  title: string;
  description?: string;
  fields: EditField[];
  /** Current values; the form is re-seeded from these every time the dialog opens. */
  values: EditFieldValues;
  pending: boolean;
  /** Called with the trimmed values and a `close` callback to run once the save succeeded. */
  onSave: (values: EditFieldValues, close: () => void) => void;
  /** Accessible label for the pencil trigger. */
  triggerLabel: string;
  /** Show the visible "Edit" text next to the pencil. */
  showLabel?: boolean;
}

export function EditFieldsDialog({
  title,
  description,
  fields,
  values,
  pending,
  onSave,
  triggerLabel,
  showLabel = false,
}: EditFieldsDialogProps) {
  const t = useTranslations('Academics');
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<EditFieldValues>(values);

  const missingRequired = fields.some((f) => f.required && !draft[f.name]?.trim());
  const unchanged = fields.every((f) => (draft[f.name] ?? '').trim() === (values[f.name] ?? '').trim());

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setDraft(values);
      }}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size={showLabel ? 'sm' : 'icon'}
          className={showLabel ? undefined : 'size-8'}>
          <Pencil className="size-4" />
          {showLabel ? <span className="hidden sm:inline">{t('edit')}</span> : null}
          <span className="sr-only">{triggerLabel}</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const trimmed = Object.fromEntries(
              fields.map((f) => [f.name, (draft[f.name] ?? '').trim()])
            );
            onSave(trimmed, () => setOpen(false));
          }}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {fields.map((field, index) => {
              const id = `edit-field-${field.name}`;
              const setValue = (value: string) => setDraft((d) => ({ ...d, [field.name]: value }));
              return (
                <div key={field.name} className="grid gap-2">
                  <Label htmlFor={id}>{field.label}</Label>
                  {field.type === 'textarea' ? (
                    <textarea
                      id={id}
                      rows={3}
                      value={draft[field.name] ?? ''}
                      required={field.required}
                      onChange={(e) => setValue(e.target.value)}
                      className="border-input bg-background focus-visible:ring-ring/50 min-h-20 w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
                    />
                  ) : (
                    <Input
                      id={id}
                      type={field.type}
                      min={field.min}
                      value={draft[field.name] ?? ''}
                      required={field.required}
                      autoFocus={index === 0}
                      onChange={(e) => setValue(e.target.value)}
                    />
                  )}
                  {field.hint ? <p className="text-muted-foreground text-xs">{field.hint}</p> : null}
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={missingRequired || unchanged || pending}>
              {t('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
