'use client';

import { useState } from 'react';
import { type DateRange } from 'react-day-picker';
import { Button } from '@/components/atoms/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/atoms/dialog';
import { Field, FieldError, FieldGroup, FieldLabel, FieldSet } from '@/components/atoms/field';
import { useEnrollByOrganization } from '@/lib/hooks/enrollment/enrollments.hook';
import { Roles } from '@lms-organization/shared-types';
import { yupResolver } from '@hookform/resolvers/yup';
import { IconPlus } from '@tabler/icons-react';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { toast } from 'react-toastify';
import { CourseMultiSelect } from '@/components/organs/select/course-multi-select';
import { OrgUserMultiSelect } from '@/components/organs/select/org-user-multi-select';
import Calendar05 from '@/components/molecules/date-input/calendar-05';
import type { Option } from '@/components/molecules/multi-select/multi-select';
import { Label } from '@/components/atoms/label';
import { createEnrollmentSchema, CreateEnrollmentSchema } from './add-enrollment-dialog.schema';

export function AddEnrollmentDialog() {
  const t = useTranslations('AddEnrollmentDialog');
  const [open, setOpen] = useState(false);

  const [userOptions, setUserOptions] = useState<Option[]>([]);
  const [courseOptions, setCourseOptions] = useState<Option[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const { mutateAsync: enroll, isPending } = useEnrollByOrganization();

  const form = useForm<CreateEnrollmentSchema>({
    resolver: yupResolver(createEnrollmentSchema) as Resolver<CreateEnrollmentSchema>,
    defaultValues: { user: '', course: '', startsAt: null, endsAt: null },
  });

  const handleUserChange = (opts: Option[]) => {
    setUserOptions(opts);
    form.setValue('user', opts[0]?.value ?? '', { shouldValidate: true });
  };

  const handleCourseChange = (opts: Option[]) => {
    setCourseOptions(opts);
    form.setValue('course', opts[0]?.value ?? '', { shouldValidate: true });
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    form.setValue('startsAt', range?.from ?? null, { shouldValidate: true });
    form.setValue('endsAt', range?.to ?? null, { shouldValidate: true });
  };

  const handleSubmit = async (data: CreateEnrollmentSchema) => {
    try {
      await enroll({
        userId: data.user,
        courseId: data.course,
        startsAt: data.startsAt ? new Date(data.startsAt).toISOString() : undefined,
        endsAt: data.endsAt ? new Date(data.endsAt).toISOString() : undefined,
      });
      toast.success(t('enrollmentSuccess'));
      resetForm();
      setOpen(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t('somethingWentWrong');
      toast.error(errorMessage ?? t('somethingWentWrong'));
    }
  };

  const resetForm = () => {
    form.reset({ user: '', course: '', startsAt: null, endsAt: null });
    setUserOptions([]);
    setCourseOptions([]);
    setDateRange(undefined);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
      }}>
      <DialogTrigger asChild>
        <Button effect="expandIcon" iconPlacement="right" icon={IconPlus} variant="default">
          {t('addEnrollment')}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit(handleSubmit)(e);
          }}>
          <DialogHeader className="mb-6">
            <DialogTitle>{t('title')}</DialogTitle>
            <DialogDescription>{t('description')}</DialogDescription>
          </DialogHeader>

          <FieldSet>
            <FieldGroup>
              <Controller
                name="user"
                control={form.control}
                render={({ fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>{t('chooseUser')}</FieldLabel>
                    <OrgUserMultiSelect
                      value={userOptions}
                      onChange={handleUserChange}
                      placeholder={t('userPlaceholder')}
                      roleFilter={Roles.STUDENT}
                      maxSelected={1}
                    />
                    {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                  </Field>
                )}
              />

              <Controller
                name="course"
                control={form.control}
                render={({ fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>{t('chooseCourse')}</FieldLabel>
                    <CourseMultiSelect
                      value={courseOptions}
                      onChange={handleCourseChange}
                      placeholder={t('coursePlaceholder')}
                      maxSelected={1}
                    />
                    {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                  </Field>
                )}
              />

              <div className="space-y-2">
                <Label>{t('subscriptionDates')}</Label>
                <p className="text-muted-foreground text-xs">{t('subscriptionDatesHint')}</p>
                <Calendar05 dateRange={dateRange} onDateRangeChange={handleDateRangeChange} />
                {(form.formState.errors.startsAt ?? form.formState.errors.endsAt) ? (
                  <p className="text-destructive text-xs">
                    {form.formState.errors.endsAt?.message ??
                      form.formState.errors.startsAt?.message}
                  </p>
                ) : null}
              </div>
            </FieldGroup>
          </FieldSet>

          <DialogFooter className="mt-6">
            <DialogClose asChild>
              <Button variant="outline" type="button" disabled={isPending}>
                {t('cancel')}
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('saveChanges')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
