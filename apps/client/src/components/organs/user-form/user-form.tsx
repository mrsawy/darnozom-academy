'use client';

import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useTranslations } from 'next-intl';
import type * as Yup from 'yup';
import { toast } from 'react-toastify';
import { ArrowLeft, Globe, Save, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/atoms/avatar';
import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { Separator } from '@/components/atoms/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/atoms/tabs';
import { Link } from '@/i18n/navigation';
import { extractErrorMessages } from '@/lib/utils/extractErrorMessages';
import { ROUTE_ORG_USERS } from '@/lib/data/constants/routes.constants';
import { Country, UserStatus } from '@darnozom/shared-types';
import type { IInstructor, IParent, IStudent, IUser } from '@/lib/types/user/user.interface';
import {
  buildCreateUserSchema,
  buildEditUserSchema,
  buildSelfUserSchema,
  type CreateUserFormData,
} from './user-form.schema';
import BasicTab from './components/basic-tab';
import ProfileTab from './components/profile-tab';
import SecurityTab from './components/security-tab';
import PreferencesTab from './components/preferences-tab';
import { cn } from '@/lib/utils';

export type UserFormMode = 'self' | 'create' | 'edit';

export interface UserFormProps {
  mode: UserFormMode;
  initialUser?: IUser | IInstructor | IParent | IStudent | null;
  onSubmit: (data: CreateUserFormData) => void | Promise<void>;
  isPending?: boolean;
  /** Override the back-button href in admin mode (defaults to org users list). */
  backHref?: string;
}

function buildSchema(mode: UserFormMode, tVal: (key: string) => string) {
  if (mode === 'self') return buildSelfUserSchema(tVal);
  if (mode === 'create') return buildCreateUserSchema(tVal);
  return buildEditUserSchema(tVal);
}

function buildDefaultValues(
  mode: UserFormMode,
  initialUser?: IUser | IInstructor | IParent | IStudent | null
): Partial<CreateUserFormData> {
  if (mode === 'create' || !initialUser) {
    return {
      status: UserStatus.ACTIVE,
      country: Country.Egypt,
      preferences: { language: 'en', emailNotifications: true, darkMode: false },
    };
  }

  return {
    _id: initialUser._id,
    username: initialUser.username,
    email: initialUser.email,
    phone: initialUser.phone,
    firstName: initialUser.firstName,
    lastName: initialUser.lastName,
    roleName: initialUser.roleName,
    organizationId: initialUser.organizationId,
    status: initialUser.status?.toUpperCase() as UserStatus,
    country: (initialUser.profile?.address?.country as Country) ?? Country.Egypt,
    preferredCurrency: initialUser.preferredCurrency as CreateUserFormData['preferredCurrency'],
    parentUserId: 'parentUserId' in initialUser ? initialUser.parentUserId : undefined,
    childUsersIds:
      'childUsers' in initialUser
        ? (initialUser.childUsersIds ?? initialUser.childUsers?.map((u) => u._id) ?? [])
        : undefined,
    childUsers:
      'childUsers' in initialUser
        ? ((initialUser.childUsers ?? []) as CreateUserFormData['childUsers'])
        : undefined,
    categoriesIds: 'categoriesIds' in initialUser ? (initialUser.categoriesIds ?? []) : [],
    categories: 'categories' in initialUser ? (initialUser.categories ?? []) : [],
    gradesIds: 'gradesIds' in initialUser ? (initialUser.gradesIds ?? []) : [],
    grades: 'grades' in initialUser ? (initialUser.grades ?? []) : [],
    schoolTypesIds: 'schoolTypesIds' in initialUser ? (initialUser.schoolTypesIds ?? []) : [],
    schoolTypes: 'schoolTypes' in initialUser ? (initialUser.schoolTypes ?? []) : [],
    profile: {
      bio: initialUser.profile?.bio ?? '',
      shortBio: initialUser.profile?.shortBio ?? '',
      avatar: initialUser.profile?.avatar ?? '',
      dateOfBirth: initialUser.profile?.dateOfBirth
        ? new Date(initialUser.profile.dateOfBirth)
        : undefined,
      address: {
        street: initialUser.profile?.address?.street ?? '',
        city: initialUser.profile?.address?.city ?? '',
        state: initialUser.profile?.address?.state ?? '',
        zipCode: initialUser.profile?.address?.zipCode ?? '',
        country: initialUser.profile?.address?.country ?? '',
      },
      socialLinks: {
        linkedin: initialUser.profile?.socialLinks?.linkedin ?? '',
        twitter: initialUser.profile?.socialLinks?.twitter ?? '',
        instagram: initialUser.profile?.socialLinks?.instagram ?? '',
        facebook: initialUser.profile?.socialLinks?.facebook ?? '',
        youtube: initialUser.profile?.socialLinks?.youtube ?? '',
        tiktok: initialUser.profile?.socialLinks?.tiktok ?? '',
        website: initialUser.profile?.socialLinks?.website ?? '',
        other: initialUser.profile?.socialLinks?.other ?? '',
      },
    },
    preferences: {
      language: initialUser.preferences?.language ?? 'en',
      emailNotifications: initialUser.preferences?.emailNotifications ?? true,
      darkMode: initialUser.preferences?.darkMode ?? false,
    },
  };
}

export default function UserForm({
  mode,
  initialUser,
  onSubmit,
  isPending = false,
  backHref = ROUTE_ORG_USERS,
}: UserFormProps) {
  const t = useTranslations('UserForm');
  const tVal = useTranslations('UserForm.validation');
  const schema = useMemo(() => buildSchema(mode, tVal), [mode, tVal]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<CreateUserFormData>({
    resolver: yupResolver(schema as Yup.ObjectSchema<CreateUserFormData>),
    defaultValues: buildDefaultValues(mode, initialUser) as CreateUserFormData,
  });

  const triggerSubmit = () => {
    void handleSubmit(
      (data) => {
        void onSubmit(data);
      },
      (err) => {
        for (const e of extractErrorMessages(err)) toast.error(e);
      }
    )();
  };

  const isSelf = mode === 'self';

  return (
    <div className={isSelf ? 'mx-auto max-w-2xl space-y-6 p-6' : 'min-h-screen'}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      {isSelf ? (
        <>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 rounded-xl">
              <AvatarImage src={initialUser?.profile?.avatar} alt={initialUser?.firstName} />
              <AvatarFallback className="rounded-xl text-lg">
                {initialUser?.firstName?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">{t('title')}</h1>
              <p className="text-muted-foreground text-sm">{t('subtitle')}</p>
            </div>
          </div>
          <Separator />
        </>
      ) : (
        <div className="border-b">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <Link href={backHref} className="flex cursor-pointer items-center">
                <ArrowLeft className="mr-2 h-5 w-5" />
                {t('backToUsers')}
              </Link>
              <Button type="button" onClick={triggerSubmit} size="sm" disabled={isPending}>
                <Save className="mr-2 h-4 w-4" />
                {t('saveUser')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div className={isSelf ? '' : 'mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8'}>
        <div className={isSelf ? '' : 'grid grid-cols-1 gap-8 lg:grid-cols-3'}>
          {/* Main content */}
          <div className={isSelf ? '' : 'lg:col-span-2'}>
            {isSelf ? null : (
              <div className="mb-6">
                <div className="mb-2 flex items-center space-x-3">
                  <User className="h-8 w-8" />
                  <h1 className="text-3xl font-bold">
                    {mode === 'edit' ? t('editUser') : t('createUser')}
                  </h1>
                </div>
                <p>{t('addOrModify')}</p>
              </div>
            )}

            <Tabs defaultValue="basic" className={isSelf ? '' : 'w-full'}>
              <TabsList
                className={cn(
                  isSelf
                    ? 'grid h-auto w-full grid-cols-1 items-stretch gap-1 sm:h-9 sm:grid-cols-4 sm:items-center sm:gap-0 max-sm:[&>button]:w-full'
                    : 'flex w-full flex-col justify-center sm:flex-row'
                )}>
                <TabsTrigger value="basic">{t('tabs.basic')}</TabsTrigger>
                <TabsTrigger value="profile">{t('tabs.profile')}</TabsTrigger>
                <TabsTrigger value="security">{t('tabs.security')}</TabsTrigger>
                <TabsTrigger value="preferences">{t('tabs.preferences')}</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-6">
                <BasicTab
                  errors={errors}
                  register={register}
                  setValue={setValue}
                  watch={watch}
                  mode={mode}
                />
              </TabsContent>

              <TabsContent value="profile" className="space-y-6">
                <ProfileTab
                  errors={errors}
                  register={register}
                  setValue={setValue}
                  watch={watch}
                  mode={mode}
                  initialUser={(initialUser as IUser) ?? null}
                />
              </TabsContent>

              <TabsContent value="security" className="space-y-6">
                <SecurityTab
                  errors={errors}
                  register={register}
                  setValue={setValue}
                  watch={watch}
                  mode={mode}
                />
              </TabsContent>

              <TabsContent value="preferences" className="space-y-6">
                <PreferencesTab setValue={setValue} watch={watch} />
              </TabsContent>
            </Tabs>

            {/* Save button for self mode */}
            {isSelf ? (
              <Button
                type="button"
                onClick={triggerSubmit}
                disabled={isPending}
                className="mt-6 w-full">
                {isPending ? t('saving') : t('save')}
              </Button>
            ) : null}
          </div>

          {/* Sidebar — admin mode only */}
          {isSelf ? null : (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t('userStatus')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{t('status')}</span>
                    <Badge>{watch('status') ?? UserStatus.ACTIVE}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{t('role')}</span>
                    <Badge variant="outline">
                      {watch('roleName') ? t(`roles.${watch('roleName')}`) : t('notSelected')}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <Globe className="me-2 h-5 w-5 text-blue-500" />
                    {t('tips')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-muted-foreground space-y-2 text-sm">
                    <li>• {t('tip1')}</li>
                    <li>• {t('tip2')}</li>
                    <li>• {t('tip3')}</li>
                    <li>• {t('tip4')}</li>
                    {mode === 'edit' ? <li>• {t('tip5')}</li> : null}
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
