'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { toast } from 'react-toastify';
import { uploadFileToS3 } from '@/lib/actions/file/uploadFile';
import { getFileUrl } from '@/lib/actions/file/getPreSignedUrl';
import DropzoneWithPreview from '@/components/molecules/dropzone-preview';
import { AcademyThemeStyle } from '@/components/molecules/academy-theme-style';
import {
  DEFAULT_PRIMARY_COLOR,
  DEFAULT_SECONDARY_COLOR,
  DEFAULT_THEME_ID,
} from '@/lib/data/themes/theme-utils';
import {
  useOrganizationSettings,
  useUpdateOrganizationSettings,
} from '@/lib/hooks/organization/use-organization-settings.hook';
import {
  academySettingsSchema,
  type AcademySettingsFormValues,
} from './academy-settings-form.schema';
import { ThemePicker } from './theme-picker';

const IMAGE_ACCEPT = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/svg+xml': ['.svg'],
};

const FIELD_CLASS = 'bg-background w-full rounded-md border px-3 py-2 text-sm';

export function AcademySettingsForm() {
  const t = useTranslations('AcademySettings');
  const { data: settings, isLoading } = useOrganizationSettings();
  const updateSettings = useUpdateOrganizationSettings();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AcademySettingsFormValues>({
    resolver: yupResolver(academySettingsSchema),
    defaultValues: {
      name: '',
      description: '',
      themeId: DEFAULT_THEME_ID,
      primaryColor: DEFAULT_PRIMARY_COLOR,
      secondaryColor: DEFAULT_SECONDARY_COLOR,
    },
  });

  const [logoFile, setLogoFile] = useState<File[] | undefined>();
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFileKey, setLogoFileKey] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  useEffect(() => {
    if (!settings) return;
    reset({
      name: settings.name ?? '',
      description: settings.description ?? '',
      themeId: settings.themeId,
      primaryColor: settings.primaryColor,
      secondaryColor: settings.secondaryColor,
    });
    setLogoFileKey(settings.logoFileKey ?? null);
    if (settings.logoFileKey) {
      void (async () => {
        try {
          const url = (await getFileUrl({ fileKey: settings.logoFileKey! })) as string;
          setLogoPreview(url);
        } catch {
          // ignore preview errors
        }
      })();
    }
  }, [settings, reset]);

  const themeId = watch('themeId');
  const primaryColor = watch('primaryColor');
  const secondaryColor = watch('secondaryColor');

  const handleLogoDrop = async (files: File[]) => {
    if (!files[0]) return;
    setLogoFile(files);
    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result === 'string') setLogoPreview(e.target.result);
    };
    reader.readAsDataURL(files[0]);

    setIsUploadingLogo(true);
    try {
      const fileKey = await uploadFileToS3({ file: files[0], isPublic: true, customPath: 'logos' });
      setLogoFileKey(fileKey);
    } catch {
      toast.error(t('logoUploadError'));
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const onSubmit = (values: AcademySettingsFormValues) => {
    updateSettings.mutate({
      name: values.name,
      description: values.description || null,
      themeId: values.themeId,
      primaryColor: values.primaryColor,
      secondaryColor: values.secondaryColor,
      ...(logoFileKey !== (settings?.logoFileKey ?? null) && logoFileKey
        ? { logoFileKey }
        : {}),
    });
  };

  const errorText = (message?: string) => (message ? t(`validation.${message}`) : null);

  if (isLoading) {
    return <div className="bg-card h-64 animate-pulse rounded-lg border" />;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Live preview: overrides the dashboard theme until saved or the page is left. */}
      <AcademyThemeStyle theme={{ themeId, primaryColor, secondaryColor }} />

      {/* General */}
      <div className="bg-card text-card-foreground space-y-4 rounded-lg border p-6">
        <h2 className="text-base font-semibold">{t('generalSection')}</h2>

        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">
            {t('name')} <span className="text-destructive">*</span>
          </label>
          <input id="name" type="text" {...register('name')} className={FIELD_CLASS} />
          {errors.name ? (
            <p className="text-destructive text-xs">{errorText(errors.name.message)}</p>
          ) : null}
        </div>

        {settings?.slug ? (
          <div className="space-y-2">
            <label htmlFor="slug" className="text-sm font-medium">
              {t('slug')}
            </label>
            <input
              id="slug"
              type="text"
              value={settings.slug}
              readOnly
              disabled
              dir="ltr"
              className={`${FIELD_CLASS} text-muted-foreground font-mono`}
            />
            <p className="text-muted-foreground text-xs">{t('slugHint')}</p>
          </div>
        ) : null}

        <div className="space-y-2">
          <label htmlFor="description" className="text-sm font-medium">
            {t('description')}
          </label>
          <textarea
            id="description"
            rows={3}
            {...register('description')}
            className={FIELD_CLASS}
          />
          {errors.description ? (
            <p className="text-destructive text-xs">{errorText(errors.description.message)}</p>
          ) : null}
        </div>
      </div>

      {/* Logo */}
      <div className="bg-card text-card-foreground space-y-4 rounded-lg border p-6">
        <h2 className="text-base font-semibold">{t('logoSection')}</h2>
        <p className="text-muted-foreground text-sm">{t('logoHint')}</p>

        {/* The dropzone only previews freshly dropped files, so show the saved logo here. */}
        {logoPreview && !logoFile ? (
          <div className="bg-muted flex h-28 items-center justify-center rounded-md border p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt={t('logoSection')}
              src={logoPreview}
              className="max-h-full max-w-full object-contain"
            />
          </div>
        ) : null}

        <DropzoneWithPreview
          files={logoFile}
          handleDrop={(files) => void handleLogoDrop(files)}
          filePreview={logoPreview}
          accept={IMAGE_ACCEPT}
          maxFiles={1}
          maxSize={2 * 1024 * 1024}
        />
        {isUploadingLogo ? (
          <p className="text-muted-foreground text-xs">{t('logoUploading')}</p>
        ) : null}
      </div>

      {/* Theme */}
      <div className="bg-card text-card-foreground space-y-4 rounded-lg border p-6">
        <div>
          <h2 className="text-base font-semibold">{t('themeSection')}</h2>
          <p className="text-muted-foreground text-sm">{t('themeHint')}</p>
        </div>

        <ThemePicker
          value={themeId}
          onChange={(id) => setValue('themeId', id, { shouldDirty: true })}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={updateSettings.isPending || isUploadingLogo}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50">
          {t('save')}
        </button>
      </div>
    </form>
  );
}
