'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Label } from '@/components/atoms/label';
import { FieldErrors, UseFormRegister } from 'react-hook-form';
import { CreateCourseSchema } from '@/lib/schema/course.schema';
import { BookOpen, Plus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { CourseFormSection } from './course-form-section';

interface CourseBasicInfoSectionProps {
  register: UseFormRegister<CreateCourseSchema>;
  errors: FieldErrors<CreateCourseSchema>;
  learningObjectives: string[];
  updateObjective: (index: number, value: string) => void;
  removeObjective: (index: number) => void;
  onAddObjective: () => void;
}

export function CourseBasicInfoSection({
  register,
  errors,
  learningObjectives,
  updateObjective,
  removeObjective,
  onAddObjective,
}: CourseBasicInfoSectionProps) {
  const t = useTranslations('CourseForm');

  return (
    <CourseFormSection
      title={t('basicInformation')}
      description={t('basicInformationHelp')}
      icon={BookOpen}>
      <div className="space-y-4">
        <div className="flex w-full flex-col gap-1.5">
          <Label htmlFor="name">{t('courseName')}</Label>
          <Input
            id="name"
            placeholder={t('courseNamePlaceholder')}
            className={cn('w-full', errors.name && 'border-destructive')}
            {...register('name')}
          />
          {errors.name ? <p className="text-destructive text-sm">{errors.name.message}</p> : null}
        </div>

        <div className="flex w-full flex-col gap-1.5">
          <Label htmlFor="shortDescription">{t('shortDescription')}</Label>
          <Input
            id="shortDescription"
            placeholder={t('shortDescriptionPlaceholder')}
            {...register('shortDescription')}
          />
        </div>

        <div className="flex w-full flex-col gap-1.5">
          <Label htmlFor="description">{t('fullDescription')}</Label>
          <textarea
            id="description"
            placeholder={t('fullDescriptionPlaceholder')}
            className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[120px] w-full resize-y rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            {...register('description')}
          />
        </div>

        <div className="bg-muted/30 space-y-4 rounded-lg border p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">{t('learningObjectives')}</p>
              <p className="text-muted-foreground text-xs">{t('learningObjectivesHelp')}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onAddObjective}
              className="shrink-0 gap-1">
              <Plus className="h-4 w-4" />
              {t('addObjective')}
            </Button>
          </div>

          <div className="space-y-2">
            {learningObjectives.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t('noLearningObjectives')}</p>
            ) : (
              learningObjectives.map((objective, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="bg-primary/10 text-primary flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                    {index + 1}
                  </span>
                  <Input
                    value={objective}
                    onChange={(e) => updateObjective(index, e.target.value)}
                    placeholder={t('learningObjectivePlaceholder', { index: index + 1 })}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeObjective(index)}
                    className="text-destructive hover:text-destructive shrink-0">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>

          {errors.learningObjectives ? (
            <p className="text-destructive text-sm">{errors.learningObjectives.message}</p>
          ) : null}
        </div>
      </div>
    </CourseFormSection>
  );
}
