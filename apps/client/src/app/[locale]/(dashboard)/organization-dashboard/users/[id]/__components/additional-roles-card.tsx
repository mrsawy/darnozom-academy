'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ADDITIONAL_ROLE_OPTIONS, Roles } from '@darnozom/shared-types';
import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/atoms/card';
import { Checkbox } from '@/components/atoms/checkbox';
import { useSetAdditionalRoles } from '@/lib/hooks/academics/use-academics.hook';

interface AdditionalRolesCardProps {
  userId: string;
  roleName: Roles;
  initial: Roles[];
}

export function AdditionalRolesCard({ userId, roleName, initial }: AdditionalRolesCardProps) {
  const t = useTranslations('Academics');
  const [selected, setSelected] = useState<Roles[]>(initial);
  const save = useSetAdditionalRoles();
  if (roleName === Roles.STUDENT || roleName === Roles.PARENT) return null;
  const options = ADDITIONAL_ROLE_OPTIONS.filter((role) => role !== roleName);

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>{t('additionalRoles.title')}</CardTitle>
        <CardDescription>{t('additionalRoles.hint')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-2">
          {options.map((role) => (
            <label key={role} className="flex items-center gap-2">
              <Checkbox
                checked={selected.includes(role)}
                onCheckedChange={(checked) =>
                  setSelected((prev) =>
                    checked ? [...prev, role] : prev.filter((r) => r !== role)
                  )
                }
              />
              <span>{t(`roles.${role}`)}</span>
            </label>
          ))}
        </div>
        <Button
          disabled={save.isPending}
          onClick={() => save.mutate({ userId, additionalRoles: selected })}>
          {t('save')}
        </Button>
      </CardContent>
    </Card>
  );
}
