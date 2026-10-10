'use client';

import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Textarea } from '@/components/atoms/textarea';
import { useTranslations } from 'next-intl';

interface AddChildFormProps {
  name: string;
  description: string;
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel?: string;
}

export function AddChildForm({
  name,
  description,
  onNameChange,
  onDescriptionChange,
  onSubmit,
  onCancel,
  submitLabel,
}: AddChildFormProps) {
  const t = useTranslations('SingleCategoryView');

  return (
    <div className="p-4">
      <div className="space-y-3">
        <Input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={t('subcategoryNamePlaceholder')}
        />
        <Textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder={t('descriptionOptional')}
          rows={2}
        />
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={onSubmit}
            disabled={!name.trim()}
            size="sm"
            className="flex-1">
            {submitLabel ?? t('addSubcategory')}
          </Button>
          <Button type="button" onClick={onCancel} variant="outline" size="sm">
            {t('cancel')}
          </Button>
        </div>
      </div>
    </div>
  );
}
