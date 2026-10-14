'use client';

import { useTranslations } from 'next-intl';
import { AtRiskReason, Roles } from '@darnozom/shared-types';
import { Badge } from '@/components/atoms/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/atoms/select';

export interface StaffCandidate {
  _id: string;
  firstName: string;
  lastName: string;
  roleName: string;
  additionalRoles: string[];
}

export interface StaffCardGroup {
  coordinatorId: string | null;
  supervisorId: string | null;
  atRisk: boolean;
  atRiskReason: AtRiskReason | null;
}

const UNASSIGNED = '__none__';
const holds = (user: StaffCandidate, role: Roles) =>
  user.roleName === role || user.additionalRoles.includes(role);

export function StaffCard({
  group,
  candidates,
  onChange,
}: {
  group: StaffCardGroup;
  candidates: StaffCandidate[];
  onChange: (patch: { coordinatorId?: string | null; supervisorId?: string | null }) => void;
}) {
  const t = useTranslations('Academics');

  const seat = (
    label: string,
    role: Roles,
    current: string | null,
    emit: (value: string | null) => { coordinatorId?: string | null; supervisorId?: string | null }
  ) => {
    const options = candidates.filter((user) => holds(user, role));
    const assigned = options.find((user) => user._id === current);
    return (
      <div className="space-y-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-muted-foreground text-sm">
          {assigned ? `${assigned.firstName} ${assigned.lastName}` : t('tasks.unassigned')}
        </p>
        <Select
          value={current ?? UNASSIGNED}
          onValueChange={(value) => onChange(emit(value === UNASSIGNED ? null : value))}>
          <SelectTrigger aria-label={label}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNASSIGNED}>{t('tasks.unassigned')}</SelectItem>
            {options.map((user) => (
              <SelectItem key={user._id} value={user._id}>
                {`${user.firstName} ${user.lastName}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>{t('tasks.staff')}</CardTitle>
        {group.atRisk ? (
          <div className="flex items-center gap-2">
            <Badge variant="destructive">{t('tasks.atRisk')}</Badge>
            {group.atRiskReason ? (
              <span className="text-muted-foreground text-sm">
                {t(
                  `tasks.atRiskReason.${group.atRiskReason}` as 'tasks.atRiskReason.NO_COORDINATOR'
                )}
              </span>
            ) : null}
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {seat(t('tasks.coordinator'), Roles.COORDINATOR, group.coordinatorId, (value) => ({
          coordinatorId: value,
        }))}
        {seat(t('tasks.supervisor'), Roles.SUPERVISOR, group.supervisorId, (value) => ({
          supervisorId: value,
        }))}
      </CardContent>
    </Card>
  );
}
