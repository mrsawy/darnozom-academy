'use client';

import { useMemo } from 'react';
import { FieldErrors, PathValue, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { CreateCourseSchema } from '@/lib/schema/course.schema';
import { UserCheck, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { UserMultiSelect } from '@/components/molecules/multi-select/user-multi-select';
import UserCombobox from '@/components/molecules/user-combobox';
import type { Option } from '@/components/molecules/multi-select/multi-select';
import { Roles } from '@lms-organization/shared-types';
import type { IInstructor } from '@/lib/types/user/user.interface';
import { Label } from '@/components/atoms/label';

interface CourseInstructorSectionProps {
  watch: UseFormWatch<CreateCourseSchema>;
  setValue: UseFormSetValue<CreateCourseSchema>;
  errors: FieldErrors<CreateCourseSchema>;
  selectedCoInstructors: Option[];
  onCoInstructorsChange: (options: Option[]) => void;
  /** Populated instructor from the existing course (update mode). Used to pre-fill the selection label. */
  existingInstructor?: IInstructor;
}

function instructorDisplayName(instructor?: IInstructor): string | undefined {
  if (!instructor) return undefined;
  const fullName = [instructor.firstName, instructor.lastName].filter(Boolean).join(' ');
  if (fullName) return fullName;
  return instructor.email ?? instructor.username;
}

export function CourseInstructorSection({
  watch,
  setValue,
  errors,
  selectedCoInstructors,
  onCoInstructorsChange,
  existingInstructor,
}: CourseInstructorSectionProps) {
  const t = useTranslations('CourseForm');

  const instructorId = watch('instructorId') ?? null;

  const initialInstructorLabel = useMemo(() => {
    if (!existingInstructor) return;
    if (instructorId && existingInstructor._id !== instructorId) return;
    return instructorDisplayName(existingInstructor);
  }, [existingInstructor, instructorId]);

  const excludeCoInstructorIds = useMemo(
    () => selectedCoInstructors.map((o) => o.value),
    [selectedCoInstructors]
  );

  const excludeMainInstructorIds = useMemo(
    () => (instructorId ? [instructorId] : []),
    [instructorId]
  );

  const handleMainInstructorChange = (nextId: string | null) => {
    setValue('instructorId', nextId as PathValue<CreateCourseSchema, 'instructorId'>, {
      shouldValidate: true,
      shouldDirty: true,
    });
    if (!nextId) {
      onCoInstructorsChange([]);
      setValue('coInstructorsIds', [] as PathValue<CreateCourseSchema, 'coInstructorsIds'>, {
        shouldDirty: true,
      });
    }
  };

  return (
    <section className="bg-card space-y-5 rounded-xl border p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
          <UserCheck className="size-4" />
        </div>
        <div>
          <h3 className="text-base font-semibold tracking-tight sm:text-lg">
            {t('instructorAssignment')}
          </h3>
          <p className="text-muted-foreground mt-0.5 text-sm">{t('instructorAssignmentHelp')}</p>
        </div>
      </div>

      <div className="space-y-2">
        <UserCombobox
          value={instructorId}
          onValueChange={handleMainInstructorChange}
          initialLabel={initialInstructorLabel}
          label={t('mainInstructor')}
          placeholder={t('selectMainInstructor')}
          roleFilter={Roles.INSTRUCTOR}
          excludeUserIds={excludeCoInstructorIds}
          error={!!errors.instructorId}
        />
        {errors.instructorId ? (
          <p className="text-destructive text-sm">{errors.instructorId.message}</p>
        ) : null}
      </div>

      {instructorId ? (
        <div className="animate-in fade-in-0 space-y-2 border-t pt-5 duration-300">
          <div className="flex items-center gap-2">
            <Users className="text-muted-foreground size-4" />
            <Label className="text-sm font-medium">{t('coInstructors')}</Label>
          </div>
          <UserMultiSelect
            value={selectedCoInstructors}
            onChange={onCoInstructorsChange}
            placeholder={t('selectCoInstructors')}
            roleFilter={Roles.INSTRUCTOR}
            excludeUserIds={excludeMainInstructorIds}
            className="border-input"
          />
          <p className="text-muted-foreground text-xs">{t('coInstructorsHelp')}</p>
        </div>
      ) : null}
    </section>
  );
}
