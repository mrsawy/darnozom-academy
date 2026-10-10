'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { FieldErrors, UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { Country, Currency, CURRENCIES, Roles, UserStatus } from '@lms-organization/shared-types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/atoms/card';
import { Input } from '@/components/atoms/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/atoms/select';
import { Combobox } from '@/components/molecules/combobox';
import { PhoneInput } from '@/components/organs/phone-input';
import MultipleSelector, { Option } from '@/components/molecules/multi-select/multi-select';
import { UserMultiSelect } from '@/components/molecules/multi-select/user-multi-select';
import CategoryCombobox from '@/components/molecules/category-combobox';
import { CreateUserFormData } from '@/lib/schema/user.schema';
import { useGrades } from '@/lib/hooks/grade/use-grades.hook';
import { useSchoolTypes } from '@/lib/hooks/school-type/use-school-types.hook';
import type { UserFormMode } from '../user-form';

interface BasicTabProps {
  errors: FieldErrors<CreateUserFormData>;
  register: UseFormRegister<CreateUserFormData>;
  setValue: UseFormSetValue<CreateUserFormData>;
  watch: UseFormWatch<CreateUserFormData>;
  mode: UserFormMode;
}

export default function BasicTab({ errors, register, setValue, watch, mode }: BasicTabProps) {
  const t = useTranslations('UserForm');
  const tCountry = useTranslations('Country');
  const isSelf = mode === 'self';

  const roleName = watch('roleName');
  const initialCategories = watch('categories');

  const isParentRole = !isSelf && roleName?.toLowerCase() === Roles.PARENT.toLowerCase();
  const isStudentRole = !isSelf && roleName?.toLowerCase() === Roles.STUDENT.toLowerCase();
  // Instructor fields (subject/grade/school-type) show for admins managing an
  // instructor AND for instructors editing their own account (self mode).
  const showInstructorFields = roleName?.toLowerCase() === Roles.INSTRUCTOR.toLowerCase();

  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(() => {
    const ids = watch('categoriesIds');
    return ids && ids.length > 0 ? (ids.filter(Boolean) as string[]) : [];
  });
  const [selectedChildUsers, setSelectedChildUsers] = useState<Option[]>([]);
  const [selectedParentUser, setSelectedParentUser] = useState<Option[]>([]);

  const initialSelectedChildUsers = watch('childUsers');
  const initialSelectedParentUser = watch('parentUserId');
  const childUsersIds = watch('childUsersIds');

  const locale = useLocale();
  const { data: grades } = useGrades();
  const { data: schoolTypes } = useSchoolTypes();

  const gradeIds = watch('gradesIds');
  const schoolTypeIds = watch('schoolTypesIds');

  const gradeOptions: Option[] = (grades ?? []).map((grade) => ({
    value: grade._id,
    label: locale === 'ar' ? grade.nameAr : grade.nameEn,
  }));
  const schoolTypeOptions: Option[] = (schoolTypes ?? []).map((schoolType) => ({
    value: schoolType._id,
    label: locale === 'ar' ? schoolType.nameAr : schoolType.nameEn,
  }));

  const selectedGradeOptions = gradeOptions.filter((option) =>
    (gradeIds ?? []).includes(option.value)
  );
  const selectedSchoolTypeOptions = schoolTypeOptions.filter((option) =>
    (schoolTypeIds ?? []).includes(option.value)
  );

  const updateUserCategories = useCallback(
    (ids: string[]) => {
      setSelectedCategoryIds(ids);
      setValue('categoriesIds', ids);
    },
    [setValue]
  );

  const updateChildUsers = useCallback(
    (opts: Option[]) => {
      setSelectedChildUsers(opts);
      setValue(
        'childUsersIds',
        opts.map((o) => o.value)
      );
    },
    [setValue]
  );

  const updateParentUser = useCallback(
    (opts: Option[]) => {
      setSelectedParentUser(opts);
      setValue('parentUserId', opts.length > 0 ? opts[0].value : undefined);
    },
    [setValue]
  );

  // Sync child users from form
  useEffect(() => {
    if (initialSelectedChildUsers?.length && selectedChildUsers.length === 0) {
      setSelectedChildUsers(
        initialSelectedChildUsers.map((u) => ({
          value: u._id,
          label: [u.firstName, u.lastName].filter(Boolean).join(' ') || u._id,
        }))
      );
    } else if (childUsersIds?.length && selectedChildUsers.length === 0) {
      setSelectedChildUsers(
        childUsersIds.filter((id): id is string => !!id).map((id) => ({ value: id, label: id }))
      );
    } else if (!childUsersIds?.length) {
      setSelectedChildUsers([]);
    }
  }, [childUsersIds, initialSelectedChildUsers, selectedChildUsers.length]);

  // Sync parent user from form
  useEffect(() => {
    if (initialSelectedParentUser && selectedParentUser.length === 0) {
      setSelectedParentUser([
        { value: initialSelectedParentUser, label: initialSelectedParentUser },
      ]);
    } else if (!initialSelectedParentUser) {
      setSelectedParentUser([]);
    }
  }, [initialSelectedParentUser, selectedParentUser.length]);

  // Clear instructor-only fields when the (admin-selected) role changes away from
  // Instructor. Gated on showInstructorFields so a self-editing instructor — whose
  // role never changes — is never wiped.
  const hasSelectedCategories = selectedCategoryIds.length > 0;
  useEffect(() => {
    if (!showInstructorFields && hasSelectedCategories) {
      setSelectedCategoryIds([]);
      setValue('categoriesIds', []);
    }
    if (!showInstructorFields) {
      if ((gradeIds ?? []).length > 0) setValue('gradesIds', []);
      if ((schoolTypeIds ?? []).length > 0) setValue('schoolTypesIds', []);
    }
  }, [showInstructorFields, setValue, hasSelectedCategories, gradeIds, schoolTypeIds]);

  // Clear child users when role changes away from Parent
  useEffect(() => {
    if (!isParentRole) {
      setSelectedChildUsers([]);
      setValue('childUsersIds', []);
    }
  }, [isParentRole, setValue]);

  // Clear parent user when role changes away from Student
  useEffect(() => {
    if (!isStudentRole) {
      setSelectedParentUser([]);
      setValue('parentUserId', undefined);
    }
  }, [isStudentRole, setValue]);

  const categoryInitialLabels = useMemo(
    () =>
      initialCategories
        ? Object.fromEntries(initialCategories.map((category) => [category._id, category.name]))
        : undefined,
    [initialCategories]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('basic.title')}</CardTitle>
        <CardDescription>{t('basic.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* First Name */}
          <div className="space-y-2">
            <label htmlFor="firstName" className="text-sm font-medium">
              {t('basic.firstName')} *
            </label>
            <Input
              id="firstName"
              {...register('firstName')}
              placeholder={t('basic.firstNamePlaceholder')}
              className="w-full"
            />
            {errors.firstName ? (
              <p className="text-sm text-red-600">{errors.firstName.message}</p>
            ) : null}
          </div>

          {/* Last Name */}
          <div className="space-y-2">
            <label htmlFor="lastName" className="text-sm font-medium">
              {t('basic.lastName')} *
            </label>
            <Input
              id="lastName"
              {...register('lastName')}
              placeholder={t('basic.lastNamePlaceholder')}
              className="w-full"
            />
            {errors.lastName ? (
              <p className="text-sm text-red-600">{errors.lastName.message}</p>
            ) : null}
          </div>

          {/* Username */}
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium">
              {t('basic.username')} *
            </label>
            <Input
              id="username"
              {...register('username')}
              placeholder={t('basic.usernamePlaceholder')}
              className="w-full"
            />
            {errors.username ? (
              <p className="text-sm text-red-600">{errors.username.message}</p>
            ) : null}
          </div>

          {/* Email — admin only */}
          {isSelf ? null : (
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                {t('basic.email')} *
              </label>
              <Input
                id="email"
                {...register('email')}
                type="email"
                placeholder={t('basic.emailPlaceholder')}
                className="w-full"
              />
              {errors.email ? <p className="text-sm text-red-600">{errors.email.message}</p> : null}
            </div>
          )}

          {/* Phone */}
          <div className="space-y-2">
            <PhoneInput
              className="w-full"
              onValueChange={(v) => setValue('phone', v)}
              value={watch('phone')}
              label={t('basic.phone')}
            />
            {errors.phone ? <p className="text-sm text-red-600">{errors.phone.message}</p> : null}
          </div>

          {/* Role — admin only */}
          {isSelf ? null : (
            <div className="space-y-2">
              <span className="text-sm font-medium">{t('basic.role')} *</span>
              <Select onValueChange={(v) => setValue('roleName', v)} value={watch('roleName')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('basic.selectRole')} />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(Roles)
                    .filter((role) => role !== Roles.PLATFORM_ADMIN && role !== Roles.GUEST)
                    .map((role) => (
                      <SelectItem key={role} value={role}>
                        {t(`roles.${role}`)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {errors.roleName ? (
                <p className="text-sm text-red-600">{errors.roleName.message}</p>
              ) : null}
            </div>
          )}

          {/* Preferred Currency — self only */}
          {isSelf ? (
            <div className="space-y-2">
              <span className="text-sm font-medium">{t('basic.preferredCurrency')}</span>
              <Select
                value={watch('preferredCurrency') ?? Currency.USD}
                onValueChange={(v) =>
                  setValue('preferredCurrency', v as CreateUserFormData['preferredCurrency'])
                }>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>

        {/* Child Users — admin, parent role only */}
        {isParentRole ? (
          <div className="space-y-2">
            <span className="text-sm font-medium">{t('basic.childUsers')}</span>
            <UserMultiSelect
              value={selectedChildUsers}
              onChange={updateChildUsers}
              placeholder={t('basic.selectChildUsers')}
              roleFilter={Roles.STUDENT}
            />
            {errors.childUsersIds ? (
              <p className="text-sm text-red-600">{errors.childUsersIds.message}</p>
            ) : null}
          </div>
        ) : null}

        {/* Parent User — admin, student role only */}
        {isStudentRole ? (
          <div className="space-y-2">
            <span className="text-sm font-medium">{t('basic.parentUser')}</span>
            <UserMultiSelect
              value={selectedParentUser}
              onChange={updateParentUser}
              placeholder={t('basic.selectParentUser')}
              roleFilter={Roles.PARENT}
              maxSelected={1}
            />
            {errors.parentUserId ? (
              <p className="text-sm text-red-600">{errors.parentUserId.message}</p>
            ) : null}
          </div>
        ) : null}

        {/* Status + Country — admin only */}
        {isSelf ? null : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <span className="text-sm font-medium">{t('basic.status')}</span>
              <Select
                onValueChange={(v) => setValue('status', v as UserStatus)}
                defaultValue={UserStatus.ACTIVE}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('basic.selectStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UserStatus.ACTIVE}>{t('basic.active')}</SelectItem>
                  <SelectItem value={UserStatus.INACTIVE}>{t('basic.inactive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium">{t('basic.selectCountry')} *</span>
              <Combobox
                data={Object.values(Country).map((c) => ({
                  value: c,
                  label: tCountry(c.toLowerCase()),
                }))}
                value={watch('country')}
                title={t('basic.selectCountry')}
                placeholder={t('basic.selectCountryPlaceholder')}
                onValueChange={(v) => setValue('country', v as Country)}
                buttonClassName={errors.country ? 'border-red-500' : ''}
              />
              {errors.country ? (
                <p className="text-sm text-red-600">{errors.country.message}</p>
              ) : null}
            </div>
          </div>
        )}

        {/* Subject / Grade / School type — instructor role only (admin + self) */}
        {showInstructorFields ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <CategoryCombobox
                multiple
                value={selectedCategoryIds}
                onValueChange={updateUserCategories}
                label={t('basic.subjects')}
                initialLabels={categoryInitialLabels}
              />
              {errors.categoriesIds ? (
                <p className="text-sm text-red-600">{errors.categoriesIds.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium">{t('basic.grades')}</span>
              <MultipleSelector
                options={gradeOptions}
                value={selectedGradeOptions}
                placeholder={t('basic.selectGrades')}
                onChange={(opts) =>
                  setValue(
                    'gradesIds',
                    opts.map((o) => o.value)
                  )
                }
              />
              {errors.gradesIds ? (
                <p className="text-sm text-red-600">{errors.gradesIds.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium">{t('basic.schoolTypes')}</span>
              <MultipleSelector
                options={schoolTypeOptions}
                value={selectedSchoolTypeOptions}
                placeholder={t('basic.selectSchoolTypes')}
                onChange={(opts) =>
                  setValue(
                    'schoolTypesIds',
                    opts.map((o) => o.value)
                  )
                }
              />
              {errors.schoolTypesIds ? (
                <p className="text-sm text-red-600">{errors.schoolTypesIds.message}</p>
              ) : null}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
