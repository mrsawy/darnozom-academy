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
import { Country, UserStatus, Roles } from '@lms-organization/shared-types';
import { CreateUserFormData } from '@/lib/schema/user.schema';
import { FieldErrors, UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { Option } from '@/components/molecules/multi-select/multi-select';
import { UserMultiSelect } from '@/components/molecules/multi-select/user-multi-select';
import CategoryCombobox from '@/components/molecules/category-combobox';
import { useCallback, useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

interface BasicUserDataFormProps {
  errors: FieldErrors<CreateUserFormData>;
  register: UseFormRegister<CreateUserFormData>;
  setValue: UseFormSetValue<CreateUserFormData>;
  watch: UseFormWatch<CreateUserFormData>;
}

export default function BasicUserDataForm({
  errors,
  register,
  setValue,
  watch,
}: BasicUserDataFormProps) {
  const t = useTranslations('BasicUserDataForm');
  const tCountry = useTranslations('Country');
  const roleName = watch('roleName');
  const initialSelectedChildUsers = watch('childUsers');
  const initialSelectedParentUser = watch('parentUserId');
  const isParentRole = roleName?.toLowerCase() === Roles.PARENT.toLowerCase();
  const isStudentRole = roleName?.toLowerCase() === Roles.STUDENT.toLowerCase();
  const isInstructor = roleName?.toLowerCase() === Roles.INSTRUCTOR.toLowerCase();
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(() => {
    const categoriesIds = watch('categoriesIds');
    return categoriesIds && categoriesIds.length > 0
      ? (categoriesIds.filter(Boolean) as string[])
      : [];
  });
  const [selectedChildUsers, setSelectedChildUsers] = useState<Option[]>([]);
  const [selectedParentUser, setSelectedParentUser] = useState<Option[]>([]);

  const updateUserCategories = useCallback(
    (ids: string[]) => {
      setSelectedCategoryIds(ids);
      setValue('categoriesIds', ids);
    },
    [setValue]
  );

  const updateChildUsers = useCallback(
    (options: Option[]) => {
      setSelectedChildUsers(options);
      setValue(
        'childUsersIds',
        options.map((o) => o.value)
      );
    },
    [setValue]
  );

  const updateParentUser = useCallback(
    (options: Option[]) => {
      setSelectedParentUser(options);
      setValue('parentUserId', options.length > 0 ? options[0].value : undefined);
    },
    [setValue]
  );

  const childUsersIds = watch('childUsersIds');

  // Sync child users from form: prefer childUsers (with labels) when present, else childUsersIds
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

  // Sync parent user from form (only when form has value and state is empty; avoid overwriting user selection label)
  useEffect(() => {
    if (initialSelectedParentUser && selectedParentUser.length === 0) {
      setSelectedParentUser([
        { value: initialSelectedParentUser, label: initialSelectedParentUser },
      ]);
    } else if (!initialSelectedParentUser) {
      setSelectedParentUser([]);
    }
  }, [initialSelectedParentUser, selectedParentUser.length]);

  // Clear categories when role changes from Instructor to another role
  const hasSelectedCategories = selectedCategoryIds.length > 0;
  useEffect(() => {
    if (!isInstructor && hasSelectedCategories) {
      setSelectedCategoryIds([]);
      setValue('categoriesIds', []);
    }
  }, [isInstructor, setValue, hasSelectedCategories]);

  // Clear child users when role changes from Parent
  useEffect(() => {
    if (!isParentRole) {
      setSelectedChildUsers([]);
      setValue('childUsersIds', []);
    }
  }, [isParentRole, setValue]);

  // Clear parent user when role changes from Student
  useEffect(() => {
    if (!isStudentRole) {
      setSelectedParentUser([]);
      setValue('parentUserId', undefined);
    }
  }, [isStudentRole, setValue]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('basicInformation')}</CardTitle>
        <CardDescription>{t('essentialUserDetails')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Username */}
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium">
              {t('username')} *
            </label>
            <Input
              id="username"
              {...register('username')}
              placeholder={t('usernamePlaceholder')}
              className="w-full"
            />
            {errors.username ? (
              <p className="text-sm text-red-600">{errors.username.message}</p>
            ) : null}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              {t('email')} *
            </label>
            <Input
              id="email"
              {...register('email')}
              type="email"
              placeholder={t('emailPlaceholder')}
              className="w-full"
            />
            {errors.email ? <p className="text-sm text-red-600">{errors.email.message}</p> : null}
          </div>

          {/* First Name */}
          <div className="space-y-2">
            <label htmlFor="firstName" className="text-sm font-medium">
              {t('firstName')} *
            </label>
            <Input
              id="firstName"
              {...register('firstName')}
              placeholder={t('firstNamePlaceholder')}
              className="w-full"
            />
            {errors.firstName ? (
              <p className="text-sm text-red-600">{errors.firstName.message}</p>
            ) : null}
          </div>

          {/* Last Name */}
          <div className="space-y-2">
            <label htmlFor="lastName" className="text-sm font-medium">
              {t('lastName')} *
            </label>
            <Input
              id="lastName"
              {...register('lastName')}
              placeholder={t('lastNamePlaceholder')}
              className="w-full"
            />
            {errors.lastName ? (
              <p className="text-sm text-red-600">{errors.lastName.message}</p>
            ) : null}
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <PhoneInput
              className="w-full"
              onValueChange={(value) => setValue('phone', value)}
              value={watch('phone')}
              label={t('phone')}
            />
            {errors.phone ? <p className="text-sm text-red-600">{errors.phone.message}</p> : null}
          </div>

          {/* Role */}
          <div className="space-y-2">
            <span className="text-sm font-medium">{t('role')} *</span>
            <Select
              onValueChange={(value) => setValue('roleName', value)}
              value={watch('roleName')}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('selectRole')} />
              </SelectTrigger>
              <SelectContent>
                {Object.values(Roles)
                  .filter((role) => role !== Roles.PLATFORM_ADMIN)
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
        </div>

        {/* Child users (for Parent role) */}
        {isParentRole ? (
          <div className="space-y-2">
            <span className="text-sm font-medium">{t('childUsers')}</span>
            <UserMultiSelect
              value={selectedChildUsers}
              onChange={updateChildUsers}
              placeholder={t('selectChildUsers')}
              roleFilter={Roles.STUDENT}
            />
            {errors.childUsersIds ? (
              <p className="text-sm text-red-600">{errors.childUsersIds.message}</p>
            ) : null}
          </div>
        ) : null}

        {/* Parent user (for Student role) */}
        {isStudentRole ? (
          <div className="space-y-2">
            <span className="text-sm font-medium">{t('parentUser')}</span>
            <UserMultiSelect
              value={selectedParentUser}
              onChange={updateParentUser}
              placeholder={t('selectParentUser')}
              roleFilter={Roles.PARENT}
              maxSelected={1}
            />
            {errors.parentUserId ? (
              <p className="text-sm text-red-600">{errors.parentUserId.message}</p>
            ) : null}
          </div>
        ) : null}

        {/* Status and Currency */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Status */}
          <div className="space-y-2">
            <span className="text-sm font-medium">{t('status')}</span>
            <Select
              onValueChange={(value) => setValue('status', value as UserStatus)}
              defaultValue={UserStatus.ACTIVE}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('selectStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UserStatus.ACTIVE}>{t('active')}</SelectItem>
                <SelectItem value={UserStatus.INACTIVE}>{t('inactive')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Preferred Currency / Country */}
          <div className="space-y-2">
            <span className="text-sm font-medium">{t('selectCountry')} *</span>
            <Combobox
              data={Object.values(Country).map((c) => ({
                value: c,
                label: tCountry(c.toLowerCase()),
              }))}
              value={watch('country')}
              title={t('selectCountry')}
              placeholder={t('selectCountryPlaceholder')}
              onValueChange={(value) => setValue('country', value as Country)}
              buttonClassName={errors.country ? 'border-red-500' : ''}
            />
            {errors.country ? (
              <p className="text-sm text-red-600">{errors.country.message}</p>
            ) : null}
          </div>
        </div>

        {/* Categories - Only for Instructors */}
        {isInstructor ? (
          <div className="space-y-2">
            <CategoryCombobox
              multiple
              value={selectedCategoryIds}
              onValueChange={updateUserCategories}
              label={t('categories')}
            />
            {errors.categoriesIds ? (
              <p className="text-sm text-red-600">{errors.categoriesIds.message}</p>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
