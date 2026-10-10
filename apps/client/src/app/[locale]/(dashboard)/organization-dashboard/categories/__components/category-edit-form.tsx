'use client';

import { Save, X } from 'lucide-react';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Textarea } from '@/components/atoms/textarea';
import { Label } from '@/components/atoms/label';
import { useTranslations } from 'next-intl';

interface CategoryEditFormProps {
  name: string;
  description: string;
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function CategoryEditForm({
  name,
  description,
  onNameChange,
  onDescriptionChange,
  onSave,
  onCancel,
}: CategoryEditFormProps) {
  const t = useTranslations('SingleCategoryView');

  return (
    <div className="space-y-4">
      <div>
        <Label className="mb-2 block">{t('categoryName')}</Label>
        <Input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={t('categoryNamePlaceholder')}
        />
      </div>
      <div>
        <Label className="mb-2 block">{t('description')}</Label>
        <Textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          rows={4}
          placeholder={t('descriptionPlaceholder')}
        />
      </div>
      <div className="flex gap-3">
        <Button type="button" onClick={onSave}>
          <Save className="mr-2 h-4 w-4" />
          {t('saveChanges')}
        </Button>
        <Button type="button" onClick={onCancel} variant="outline">
          <X className="mr-2 h-4 w-4" />
          {t('cancel')}
        </Button>
      </div>
    </div>
  );
}
