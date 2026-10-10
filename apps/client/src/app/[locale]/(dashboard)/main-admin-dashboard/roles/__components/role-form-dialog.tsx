'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useForm, Controller, useFieldArray, type Control, type Resolver } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useTranslations } from 'next-intl';
import { IconLoader2, IconPlus, IconTrash } from '@tabler/icons-react';
import { Actions, ConditionKeys, Roles, Subjects } from '@lms-organization/shared-types';
import { Button } from '@/components/atoms/button';
import { Label } from '@/components/atoms/label';
import { Input } from '@/components/atoms/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/atoms/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/atoms/select';
import type { RoleResponse } from '@/lib/actions/role/role.action';
import {
  buildRoleFormSchema,
  defaultPermissionRow,
  emptyPermissionRow,
  type RoleFormValues,
} from './role-form.schema';
import { roleToFormValues } from './role-form.mappers';

const ACTIONS = Object.values(Actions);
const SUBJECTS = Object.values(Subjects);
const CONDITION_KEYS = Object.values(ConditionKeys);

function PermissionConditionsEditor({
  control,
  permissionIndex,
  rowErrors,
}: {
  control: Control<RoleFormValues>;
  permissionIndex: number;
  rowErrors?: {
    conditions?: { key?: { message?: string }; value?: { message?: string } }[];
  };
}) {
  const t = useTranslations('AdminRoles.form');
  const { fields, append, remove } = useFieldArray({
    control,
    name: `permissions.${permissionIndex}.conditions`,
  });

  return (
    <div className="border-muted mt-2 space-y-2 border-l-2 pl-3">
      <p className="text-muted-foreground text-xs">{t('conditionsHint')}</p>

      {fields.map((f, ci) => {
        const condErr = rowErrors?.conditions?.[ci];
        return (
          <div key={f.id} className="space-y-1">
            <div className="flex flex-wrap items-end gap-2">
              <Controller
                control={control}
                name={`permissions.${permissionIndex}.conditions.${ci}.key`}
                render={({ field }) => (
                  <div className="min-w-[140px] flex-1 space-y-1">
                    <Label className="text-xs">{t('conditionKey')}</Label>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('selectKey')} />
                      </SelectTrigger>
                      <SelectContent>
                        {CONDITION_KEYS.map((k) => (
                          <SelectItem key={k} value={k}>
                            {k}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {condErr?.key?.message ? (
                      <p className="text-destructive text-xs">{condErr.key.message}</p>
                    ) : null}
                  </div>
                )}
              />
              <Controller
                control={control}
                name={`permissions.${permissionIndex}.conditions.${ci}.value`}
                render={({ field }) => (
                  <div className="min-w-[120px] flex-1 space-y-1">
                    <Label className="text-xs">{t('conditionValue')}</Label>
                    <Input {...field} placeholder={t('conditionValuePlaceholder')} />
                    {condErr?.value?.message ? (
                      <p className="text-destructive text-xs">{condErr.value.message}</p>
                    ) : null}
                  </div>
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(ci)}
                aria-label={t('removeCondition')}>
                <IconTrash className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      })}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => append({ key: ConditionKeys.OWN, value: '' })}>
        {t('addCondition')}
      </Button>
    </div>
  );
}

interface RoleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: RoleResponse | null;
  availableNamesForCreate: Roles[];
  onSubmit: (values: RoleFormValues) => void | Promise<void>;
  isSubmitting: boolean;
}

export function RoleFormDialog({
  open,
  onOpenChange,
  role,
  availableNamesForCreate,
  onSubmit,
  isSubmitting,
}: RoleFormDialogProps) {
  const t = useTranslations('AdminRoles');
  const tVal = useTranslations('AdminRoles.validation');
  const isCreate = !role;

  const schema = useMemo(() => buildRoleFormSchema(tVal, { isCreate }), [tVal, isCreate]);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RoleFormValues>({
    resolver: yupResolver(schema) as Resolver<RoleFormValues>,
    defaultValues: {
      name: '',
      permissions: [defaultPermissionRow()],
    },
  });

  const { fields, prepend, remove } = useFieldArray({ control, name: 'permissions' });

  /** Latest names from parent — read only inside effects so unstable array refs don’t reset the form mid-edit. */
  const latestAvailableNamesRef = useRef(availableNamesForCreate);
  latestAvailableNamesRef.current = availableNamesForCreate;

  useEffect(() => {
    if (!open) return;
    if (role) {
      reset(roleToFormValues(role));
    } else {
      const names = latestAvailableNamesRef.current;
      reset({
        name: names[0] ?? '',
        permissions: [defaultPermissionRow()],
      });
    }
  }, [open, role, reset]);

  const canCreate = isCreate && availableNamesForCreate.length > 0;

  const permErrors = errors.permissions as
    | (
        | {
            action?: { message?: string };
            subject?: { message?: string };
            conditions?: { key?: { message?: string }; value?: { message?: string } }[];
          }
        | undefined
      )[]
    | undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isCreate ? t('createRole') : t('editRole')}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            void handleSubmit(async (values) => {
              await onSubmit(values);
            })(e);
          }}
          className="space-y-4">
          {isCreate ? (
            <div className="space-y-2">
              <Label>{t('form.roleName')}</Label>
              <Controller
                control={control}
                name="name"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={!canCreate}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('form.selectRoleName')} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableNamesForCreate.map((n) => (
                        <SelectItem key={n} value={n}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.name ? (
                <p className="text-destructive text-sm">{errors.name.message}</p>
              ) : null}
              {!canCreate && (
                <p className="text-muted-foreground text-sm">{t('form.allRolesExist')}</p>
              )}
            </div>
          ) : null}

          {!isCreate && role ? (
            <div className="space-y-1">
              <Label>{t('form.roleName')}</Label>
              <p className="text-sm font-medium">{role.name}</p>
              <p className="text-muted-foreground text-xs">{t('form.nameLocked')}</p>
            </div>
          ) : null}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>{t('form.permissions')}</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => prepend(emptyPermissionRow())}>
                <IconPlus className="mr-1 h-4 w-4" />
                {t('form.addPermission')}
              </Button>
            </div>

            {/* Array-level error (e.g. min 1, duplicate pairs) */}
            {errors.permissions && typeof errors.permissions.message === 'string' ? (
              <p className="text-destructive text-sm">{errors.permissions.message}</p>
            ) : null}

            <div className="flex gap-1">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('form.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting || (isCreate && !canCreate)}>
                {isSubmitting ? <IconLoader2 className="h-4 w-4 animate-spin" /> : t('form.save')}
              </Button>
            </div>
            {fields.map((field, pi) => {
              const rowErr = permErrors?.[pi];
              return (
                <div key={field.id} className="bg-muted/30 space-y-2 rounded-lg border p-3">
                  <div className="flex flex-wrap gap-2">
                    <Controller
                      control={control}
                      name={`permissions.${pi}.action`}
                      render={({ field: f }) => (
                        <div className="min-w-[140px] flex-1 space-y-1">
                          <Label className="text-xs">{t('form.action')}</Label>
                          <Select value={f.value || undefined} onValueChange={f.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder={t('form.selectAction')} />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                              {ACTIONS.map((a) => (
                                <SelectItem key={a} value={a}>
                                  {a}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {rowErr?.action?.message ? (
                            <p className="text-destructive text-xs">{rowErr.action.message}</p>
                          ) : null}
                        </div>
                      )}
                    />
                    <Controller
                      control={control}
                      name={`permissions.${pi}.subject`}
                      render={({ field: f }) => (
                        <div className="min-w-[160px] flex-1 space-y-1">
                          <Label className="text-xs">{t('form.subject')}</Label>
                          <Select value={f.value || undefined} onValueChange={f.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder={t('form.selectSubject')} />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                              {SUBJECTS.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {s}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {rowErr?.subject?.message ? (
                            <p className="text-destructive text-xs">{rowErr.subject.message}</p>
                          ) : null}
                        </div>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 self-end"
                      disabled={fields.length <= 1}
                      onClick={() => remove(pi)}
                      aria-label={t('form.removePermission')}>
                      <IconTrash className="h-4 w-4" />
                    </Button>
                  </div>
                  <PermissionConditionsEditor
                    control={control}
                    permissionIndex={pi}
                    rowErrors={rowErr}
                  />
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('form.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting || (isCreate && !canCreate)}>
              {isSubmitting ? <IconLoader2 className="h-4 w-4 animate-spin" /> : t('form.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
