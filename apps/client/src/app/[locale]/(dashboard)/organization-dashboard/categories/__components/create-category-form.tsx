'use client';

import { useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Input } from '@/components/atoms/input';
import { Button } from '@/components/atoms/button';
import { useCreateCategory } from '@/lib/hooks/category/use-category.hook';
import { Combobox } from '@/components/molecules/combobox';
import { ICategory } from '@/lib/types/category/ICategory';
import { baseCategorySchema, CategoryFormData } from '@/lib/schema/category.schema';
import { toast } from 'react-toastify';
import { useTranslations } from 'next-intl';

// Enhanced validation schema

interface CreateCategoryFormProps {
  setOpen: (open: boolean) => void;
  organizationId: string;
  parentId?: string | null;
  categories: ICategory[];
}

function flattenCategories(categories: ICategory[]): ICategory[] {
  const result: ICategory[] = [];
  const walk = (category: ICategory) => {
    result.push(category);
    category.childCategories?.forEach((child) => walk(child));
  };
  categories.forEach((category) => walk(category));
  return result;
}
const EMPTY_CATEGORIES: ICategory[] = [];
export default function CreateCategoryForm({
  setOpen,
  organizationId,
  parentId = null,
  categories = EMPTY_CATEGORIES,
}: CreateCategoryFormProps) {
  const t = useTranslations('CreateCategoryForm');

  // Flatten categories helper function

  const flatCategories = useMemo(() => flattenCategories(categories), [categories]);

  // Prepare combobox data with "None" option
  const comboboxData = useMemo(() => {
    const categoryOptions = flatCategories.map((fc) => ({
      value: fc._id,
      label: fc.name,
    }));

    return [{ value: '', label: t('noneRootCategory') }, ...categoryOptions];
  }, [flatCategories, t]);

  const createCategoryMutation = useCreateCategory();

  // Initialize form with React Hook Form and Yup resolver
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isValid, isDirty },
  } = useForm({
    resolver: yupResolver(baseCategorySchema),
    defaultValues: {
      name: '',
      description: '',
      parentId: parentId ?? '',
    },
    mode: 'onChange', // Validate on change for better UX
  });

  const onSubmit = (data: CategoryFormData) => {
    const submitData = {
      organizationId,
      name: data.name.trim(),
      ...(data.description && { description: data.description.trim() }),
      parentId: data.parentId ?? null,
    };

    createCategoryMutation.mutate(submitData, {
      onSuccess: () => {
        setOpen(false);
        reset(); // Reset form to initial state
      },
      onError: (error) => {
        // Handle error if needed
        if (error instanceof Error) {
          toast.error(error.message);
        } else {
          toast.error(t('error'));
        }
      },
    });
  };

  const handleCancel = () => {
    reset();
    setOpen(false);
  };

  return (
    <form
      onSubmit={(e) => {
        void handleSubmit(onSubmit)(e);
      }}
      className="space-y-4">
      {/* Category Name Field */}
      <div className="space-y-1">
        <span className="text-sm font-medium">{t('categoryNameRequired')}</span>
        <Controller
          name="name"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              id="name"
              placeholder={t('categoryNamePlaceholder')}
              className={errors.name ? 'border-red-500' : ''}
            />
          )}
        />
        {errors.name ? <p className="text-sm text-red-600">{errors.name.message}</p> : null}
      </div>

      {/* Description Field */}
      <div className="space-y-1">
        <span className="text-sm font-medium">{t('description')}</span>
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              id="description"
              placeholder={t('descriptionPlaceholder')}
              className={errors.description ? 'border-red-500' : ''}
            />
          )}
        />
        {errors.description ? (
          <p className="text-sm text-red-600">{errors.description.message}</p>
        ) : null}
      </div>

      {/* Parent Category Selection */}
      <div className="space-y-1">
        <span className="text-sm font-medium">{t('parentCategory')}</span>
        <Controller
          name="parentId"
          control={control}
          render={({ field: { onChange, value } }) => (
            <Combobox
              data={comboboxData}
              defaultValue={comboboxData.find((item) => item.value === value)}
              onValueChange={onChange}
              title={t('parentCategory')}
              placeholder={t('parentCategoryPlaceholder')}
              buttonClassName={errors.parentId ? 'border-red-500' : ''}
            />
          )}
        />
        {errors.parentId ? <p className="text-sm text-red-600">{errors.parentId.message}</p> : null}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={createCategoryMutation.isPending}>
          {t('cancel')}
        </Button>

        <Button
          type="submit"
          disabled={createCategoryMutation.isPending ?? !isValid}
          className={isDirty ? '' : 'opacity-50'}>
          {createCategoryMutation.isPending ? t('creating') : t('create')}
        </Button>
      </div>

      {/* Form Status Display */}
      {createCategoryMutation.isError ? (
        <div className="mt-2 text-sm text-red-600">{t('errorMessage')}</div>
      ) : null}
    </form>
  );
}
