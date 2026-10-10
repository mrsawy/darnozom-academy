'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Option } from '@/components/molecules/multi-select/multi-select';
import { useForm, SubmitHandler, Resolver, PathValue } from 'react-hook-form';
import { getCreateCourseSchema, CreateCourseSchema } from '@/lib/schema/course.schema';
import { handleCreateCourse } from '@/lib/actions/courses/createCourse.action';
import { handleUpdateCourse } from '@/lib/actions/courses/updateCourse.action';
import { toast } from 'react-toastify';
import { yupResolver } from '@hookform/resolvers/yup';
import ModulesDataTable from './tables/module-data-table';

import { useTranslations } from 'next-intl';
import {
  useMultipartUpload,
  isMultipartUploadCancelled,
} from '@/lib/hooks/file/use-multipart-upload';
import { resolveOrgUploadPath } from '@/lib/utils/auth/getAuthUserWithCache';
import {
  CourseFormProps,
  buildPublicFileKey,
  ensurePublicKey,
  CourseBasicInfoSection,
  CourseThumbnailSection,
  CourseTrailerSection,
  CourseInstructorSection,
  CourseCategoriesSection,
  CourseGradeSchoolTypeSection,
  CoursePricingSection,
  CourseSettingsSection,
  CourseAttendanceSection,
  CourseUploadProgress,
  CourseFormSubmit,
} from './course';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@/i18n/navigation';
import { ROUTE_ORG_COURSE_DETAILS } from '@/lib/data/constants/routes.constants';
import { getFirstErrorMessage } from '@/lib/utils/errors/getFirstErrorMessage';
import { normalizeCourseSchoolTypes } from '@/lib/utils/course/normalize-course-school-types';
import { courseKeys } from '@/lib/hooks/course/useCourses';

export type { CourseFormProps } from './course';

function CourseForm({ mode, setOpen, course, courseId }: CourseFormProps) {
  const t = useTranslations('CourseForm');
  const router = useRouter();
  const queryClient = useQueryClient();
  const courseValidationSchema = useMemo(
    () => getCreateCourseSchema((key, values) => t(key, values)),
    [t]
  );
  const isUpdateMode = mode === 'update';
  const [removeThumbnail, setRemoveThumbnail] = useState(false);
  const [removeTrailer, setRemoveTrailer] = useState(false);

  const [learningObjectives, setLearningObjectives] = useState<string[]>(
    course?.learningObjectives ?? []
  );
  const [offlineSchedule, setOfflineSchedule] = useState(
    course?.attendanceSettings?.offlineSchedule ?? []
  );

  const [files, setFiles] = useState<File[] | undefined>();
  const [filePreview, setFilePreview] = useState<string | undefined>(
    isUpdateMode ? course?.thumbnailKey : undefined
  );
  const [trailerFiles, setTrailerFiles] = useState<File[] | undefined>();
  const [trailerPreview, setTrailerPreview] = useState<string | undefined>(
    isUpdateMode ? course?.trailerKey : undefined
  );
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(
    course?.categoriesIds ?? []
  );

  const [initialCategoryLabels] = useState<Record<string, string>>(() =>
    Object.fromEntries((course?.categories ?? []).map((c) => [c._id, c.name]))
  );
  const [selectedGradeId, setSelectedGradeId] = useState<string | null>(
    course?.gradeId ?? course?.grade?._id ?? null
  );
  const [selectedSchoolTypeIds, setSelectedSchoolTypeIds] = useState<string[]>(
    () => normalizeCourseSchoolTypes(course ?? {}).schoolTypeIds
  );
  const [selectedCoInstructors, setSelectedCoInstructors] = useState<Option[]>(
    course?.coInstructors?.map((instructor) => ({
      value: instructor._id,
      label: `(${instructor.firstName} ${instructor.lastName}) ${instructor.email}`,
    })) ?? []
  );
  const {
    progress: uploadProgress,
    status: uploadStatus,
    error: uploadError,
    upload: multipartUpload,
    abort: abortMultipartUpload,
  } = useMultipartUpload();
  const [mediaUploadPhase, setMediaUploadPhase] = useState<'thumbnail' | 'trailer' | null>(null);
  const [isSavingCourse, setIsSavingCourse] = useState(false);

  const isUploadingMedia = uploadStatus === 'uploading';
  const isFormBusy = isUploadingMedia || isSavingCourse;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateCourseSchema>({
    resolver: yupResolver(courseValidationSchema) as unknown as Resolver<CreateCourseSchema>,
    mode: 'onSubmit',
    defaultValues:
      isUpdateMode && course
        ? {
            name: course.name ?? '',
            description: course.description ?? '',
            shortDescription: course.shortDescription ?? '',
            isPaid: course.isPaid ?? false,
            instructorId: course.instructorId ?? null,
            coInstructorsIds: course.coInstructorsIds ?? [],
            settings: {
              certificateEnabled: course.settings?.certificateEnabled ?? false,
              discussionEnabled: course.settings?.discussionEnabled ?? true,
              downloadEnabled: course.settings?.downloadEnabled ?? false,
              enrollmentLimit: course.settings?.enrollmentLimit ?? undefined,
            },
            pricing: course.isPaid
              ? (Object.fromEntries(
                  Object.entries(course.pricing ?? {}).map(([key, value]) => [
                    key,
                    {
                      ...(value as Record<string, unknown>),
                      priceUSD: undefined,
                    },
                  ])
                ) ?? {})
              : {},
            categoriesIds: course.categoriesIds ?? [],
            gradeId: course.gradeId ?? course.grade?._id ?? null,
            schoolTypeIds: normalizeCourseSchoolTypes(course).schoolTypeIds,
            attendanceSettings: course.attendanceSettings ?? {
              requireAttendance: false,
              offlineSchedule: [],
            },
          }
        : {
            isPaid: false,
            instructorId: null,
            coInstructorsIds: [],
            settings: {
              certificateEnabled: false,
              discussionEnabled: true,
              downloadEnabled: false,
              enrollmentLimit: undefined,
            },
            description: '',
            shortDescription: '',
            categoriesIds: [],
            gradeId: null,
            schoolTypeIds: [],
          },
  });

  const updateCourseCategories = useCallback(
    (ids: string[]) => {
      setSelectedCategoryIds(ids);
      setValue('categoriesIds', ids);
    },
    [setValue]
  );

  const updateCourseGrade = useCallback(
    (id: string | null) => {
      setSelectedGradeId(id);
      setValue('gradeId', id as PathValue<CreateCourseSchema, 'gradeId'>);
    },
    [setValue]
  );

  const updateCourseSchoolTypeIds = useCallback(
    (ids: string[]) => {
      setSelectedSchoolTypeIds(ids);
      setValue('schoolTypeIds', ids as PathValue<CreateCourseSchema, 'schoolTypeIds'>);
    },
    [setValue]
  );

  const updateCoInstructors = useCallback(
    (instructorsOptions: Option[]) => {
      setSelectedCoInstructors(instructorsOptions);
      setValue(
        'coInstructorsIds',
        instructorsOptions.map((inst) => inst.value) as PathValue<
          CreateCourseSchema,
          'coInstructorsIds'
        >
      );
    },
    [setValue]
  );

  const isPaid = watch('isPaid');

  useEffect(() => {
    if (!isUploadingMedia) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isUploadingMedia]);

  const onSubmit: SubmitHandler<CreateCourseSchema> = async (data) => {
    setMediaUploadPhase(null);
    try {
      const shouldUploadThumbnail = data.thumbnail instanceof File && !removeThumbnail;
      const shouldUploadTrailer = data.trailer instanceof File && !removeTrailer;
      let thumbnailKey: string | undefined;
      let trailerKey: string | undefined;

      if (shouldUploadThumbnail || shouldUploadTrailer) {
        const orgPath = await resolveOrgUploadPath();
        if (!orgPath) {
          throw new Error('Organization not found');
        }

        if (shouldUploadThumbnail && data.thumbnail instanceof File) {
          setMediaUploadPhase('thumbnail');
          const key = buildPublicFileKey(data.thumbnail, `${orgPath}/courses/thumbnails`);
          const uploadedKey = await multipartUpload(data.thumbnail, key, { isPublic: true });
          setMediaUploadPhase(null);
          if (!uploadedKey) {
            throw new Error(uploadError ?? t('toast.error'));
          }
          thumbnailKey = ensurePublicKey(uploadedKey);
        }

        if (shouldUploadTrailer && data.trailer instanceof File) {
          setMediaUploadPhase('trailer');
          const key = buildPublicFileKey(data.trailer, `${orgPath}/courses/trailers`);
          const uploadedKey = await multipartUpload(data.trailer, key, { isPublic: true });
          setMediaUploadPhase(null);
          if (!uploadedKey) {
            throw new Error(uploadError ?? t('toast.error'));
          }
          trailerKey = ensurePublicKey(uploadedKey);
        }
      }

      setIsSavingCourse(true);
      const formData = new FormData();

      for (const [key, value] of Object.entries(data)) {
        if (value instanceof File) {
          continue;
        }
        if (typeof value == 'object' && value !== null) {
          if (key === 'attendanceSettings' && 'offlineSchedule' in value) {
            const attendanceSettings = value;
            formData.append(
              key,
              JSON.stringify({
                ...attendanceSettings,
                offlineSchedule: attendanceSettings.offlineSchedule?.map(
                  ({ moduleId: _moduleId, moduleName: _moduleName, ...rest }) => rest
                ),
              })
            );
            continue;
          }
          formData.append(key, JSON.stringify(value));
          continue;
        }
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      }

      // Always send Grade / School Type (including empty array) so clearing a selection
      // on edit is persisted. Each is independent and optional.
      formData.set('gradeId', JSON.stringify(data.gradeId ?? null));
      formData.set('schoolTypeIds', JSON.stringify(data.schoolTypeIds ?? []));
      formData.set('instructorId', JSON.stringify(data.instructorId ?? null));
      formData.set('coInstructorsIds', JSON.stringify(data.coInstructorsIds ?? []));

      if (thumbnailKey) {
        formData.append('thumbnailKey', thumbnailKey);
      }
      if (trailerKey) {
        formData.append('trailerKey', trailerKey);
      }
      if (isUpdateMode && removeThumbnail) {
        formData.append('thumbnailKey', '');
      }
      if (isUpdateMode && removeTrailer) {
        formData.append('trailerKey', '');
      }

      if (isUpdateMode && courseId) {
        if (course?.publishStatus) {
          formData.append('publishStatus', course.publishStatus);
        }
        await handleUpdateCourse(
          courseId,
          formData,
          course?.thumbnailKey,
          course?.trailerKey ?? undefined
        );
        await queryClient.invalidateQueries({ queryKey: courseKeys.organization() });
        toast.success(t('toast.courseUpdated'));
        router.refresh();
      } else {
        const createdCourse = await handleCreateCourse(formData);
        await queryClient.invalidateQueries({ queryKey: courseKeys.organization() });
        toast.success(t('toast.courseCreated'));
        router.push(ROUTE_ORG_COURSE_DETAILS(createdCourse._id));
        setOpen?.(false);
      }
    } catch (error: unknown) {
      if (isMultipartUploadCancelled(error)) {
        toast.success(t('upload.uploadCancelled'));
        return;
      }
      // eslint-disable-next-line no-console -- surface unexpected failures during save
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : t('toast.error');
      toast.error(errorMessage);
    } finally {
      setMediaUploadPhase(null);
      setIsSavingCourse(false);
    }
  };

  const handleDrop = (droppedFiles: File[]) => {
    setRemoveThumbnail(false);
    setFiles(droppedFiles);
    if (droppedFiles.length > 0) {
      const file = droppedFiles[0];
      setValue('thumbnail', file as PathValue<CreateCourseSchema, 'thumbnail'>, {
        shouldValidate: true,
      });

      const reader = new FileReader();
      reader.addEventListener('load', (e) => {
        if (typeof e.target?.result === 'string') {
          setFilePreview(e.target?.result);
        }
      });
      reader.readAsDataURL(file);
    }
  };

  const handleTrailerDrop = (droppedFiles: File[]) => {
    setRemoveTrailer(false);
    setTrailerFiles(droppedFiles);
    if (droppedFiles.length > 0) {
      const file = droppedFiles[0];
      setValue('trailer', file as PathValue<CreateCourseSchema, 'trailer'>, {
        shouldValidate: true,
      });

      const reader = new FileReader();
      reader.addEventListener('load', (e) => {
        if (typeof e.target?.result === 'string') {
          setTrailerPreview(e.target?.result);
        }
      });
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveThumbnail = () => {
    setRemoveThumbnail(true);
    setFiles(undefined);
    setFilePreview(undefined);
    setValue('thumbnail', undefined as PathValue<CreateCourseSchema, 'thumbnail'>, {
      shouldValidate: true,
    });
  };

  const handleRemoveTrailer = () => {
    setRemoveTrailer(true);
    setTrailerFiles(undefined);
    setTrailerPreview(undefined);
    setValue('trailer', undefined as PathValue<CreateCourseSchema, 'trailer'>, {
      shouldValidate: true,
    });
  };

  const updateObjective = useCallback((index: number, value: string) => {
    setLearningObjectives((prev) => {
      const newObjectives = [...prev];
      newObjectives[index] = value;
      return newObjectives;
    });
  }, []);

  const removeObjective = useCallback((index: number) => {
    setLearningObjectives((prev) => prev.filter((_, i) => i !== index));
  }, []);

  useEffect(() => {
    setValue('learningObjectives', learningObjectives);
  }, [learningObjectives, setValue]);

  useEffect(() => {
    setValue(
      'attendanceSettings.offlineSchedule',
      offlineSchedule as PathValue<CreateCourseSchema, 'attendanceSettings.offlineSchedule'>
    );
  }, [offlineSchedule, setValue]);

  return (
    <div className="bg-muted/20 mx-auto w-full max-w-5xl rounded-2xl border p-4 shadow-sm sm:p-6 lg:p-8 2xl:max-w-7xl">
      <header className="mb-6 space-y-1 sm:mb-8">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {isUpdateMode ? t('updateCourse') : t('createNewCourse')}
        </h2>
        <p className="text-muted-foreground text-sm sm:text-base">
          {isUpdateMode ? t('updateCourseHelp') : t('createCourseHelp')}
        </p>
      </header>

      <form
        onSubmit={(e) => {
          setValue(
            'attendanceSettings.offlineSchedule',
            offlineSchedule as PathValue<CreateCourseSchema, 'attendanceSettings.offlineSchedule'>
          );
          void handleSubmit(onSubmit, (formErrors) => {
            // eslint-disable-next-line no-console
            console.error('[CourseForm] validation failed:', formErrors);
            const message = getFirstErrorMessage(formErrors as unknown as Record<string, unknown>);
            toast.error(message ?? t('toast.error'));
          })(e);
        }}
        className="space-y-5 sm:space-y-6">
        <CourseBasicInfoSection
          register={register}
          errors={errors}
          learningObjectives={learningObjectives}
          updateObjective={updateObjective}
          removeObjective={removeObjective}
          onAddObjective={() => setLearningObjectives((prev) => [...prev, ''])}
        />

        <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
          <CourseThumbnailSection
            isUpdateMode={isUpdateMode}
            course={course}
            removeThumbnail={removeThumbnail}
            filePreview={filePreview}
            files={files}
            onDrop={handleDrop}
            onRemove={handleRemoveThumbnail}
            thumbnailError={errors.thumbnail}
          />

          <CourseTrailerSection
            isUpdateMode={isUpdateMode}
            course={course}
            removeTrailer={removeTrailer}
            trailerPreview={trailerPreview}
            trailerFiles={trailerFiles}
            onDrop={handleTrailerDrop}
            onRemove={handleRemoveTrailer}
            trailerError={errors.trailer}
          />
        </div>

        <CourseInstructorSection
          watch={watch}
          setValue={setValue}
          errors={errors}
          selectedCoInstructors={selectedCoInstructors}
          onCoInstructorsChange={updateCoInstructors}
          existingInstructor={course?.instructor}
        />

        <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
          <CourseCategoriesSection
            selectedCategoryIds={selectedCategoryIds}
            initialLabels={initialCategoryLabels}
            onCategoriesChange={updateCourseCategories}
          />

          <CourseGradeSchoolTypeSection
            gradeId={selectedGradeId}
            schoolTypeIds={selectedSchoolTypeIds}
            onGradeChange={updateCourseGrade}
            onSchoolTypeIdsChange={updateCourseSchoolTypeIds}
          />
        </div>

        <CoursePricingSection
          isPaid={isPaid}
          watch={watch}
          setValue={setValue}
          onPaidChange={(checked) => setValue('isPaid', checked)}
          errors={errors}
        />

        <CourseSettingsSection
          register={register}
          watch={watch}
          setValue={setValue}
          errors={errors}
        />

        <CourseAttendanceSection
          watch={watch}
          setValue={setValue}
          offlineSchedule={offlineSchedule}
          setOfflineSchedule={setOfflineSchedule}
          courseId={courseId}
          errors={errors}
          mode={mode}
        />

        <CourseUploadProgress
          isUploadingMedia={isUploadingMedia}
          mediaUploadPhase={mediaUploadPhase}
          uploadProgress={uploadProgress}
          uploadError={uploadError}
          onAbortUpload={() => void abortMultipartUpload()}
        />

        <CourseFormSubmit
          isFormBusy={isFormBusy}
          isUploadingMedia={isUploadingMedia}
          isSavingCourse={isSavingCourse}
          uploadProgress={uploadProgress}
          isUpdateMode={isUpdateMode}
        />
      </form>

      {isUpdateMode && courseId ? (
        <div className="mt-8 space-y-4 border-t pt-8">
          <ModulesDataTable courseId={courseId} />
        </div>
      ) : null}
    </div>
  );
}

export default CourseForm;
