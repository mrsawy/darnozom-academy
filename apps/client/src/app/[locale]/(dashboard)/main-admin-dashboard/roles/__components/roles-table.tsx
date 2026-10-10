'use client';

import { useTranslations } from 'next-intl';
import { IconPencil, IconTrash } from '@tabler/icons-react';
import { Roles } from '@lms-organization/shared-types';
import { Button } from '@/components/atoms/button';
import { Badge } from '@/components/atoms/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/atoms/tooltip';
import type { RoleResponse, RolePermissionPayload } from '@/lib/actions/role/role.action';

const NON_DELETABLE: ReadonlySet<Roles> = new Set([
  Roles.PLATFORM_ADMIN,
  Roles.SUPER_ADMIN,
  Roles.GUEST,
]);

function PermissionsTooltip({ permissions }: { permissions: RolePermissionPayload[] }) {
  const t = useTranslations('AdminRoles.table');

  if (permissions.length === 0) {
    return <Badge variant="secondary">0</Badge>;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" className="cursor-default">
            {permissions.length}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-h-64 max-w-xs overflow-y-auto p-2 text-xs">
          <p className="mb-1 font-semibold">{t('permissionsPreview')}</p>
          <ul className="space-y-0.5">
            {permissions.map((p, i) => (
              <li key={i} className="font-mono">
                {p.action} &rarr; {p.subject}
              </li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface RolesTableProps {
  roles: RoleResponse[];
  onEdit: (role: RoleResponse) => void;
  onDelete: (role: RoleResponse) => void;
}

export function RolesTable({ roles, onEdit, onDelete }: RolesTableProps) {
  const t = useTranslations('AdminRoles');

  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 border-b">
          <tr>
            <th className="px-4 py-3 text-start font-medium">{t('table.name')}</th>
            <th className="px-4 py-3 text-start font-medium">{t('table.permissionCount')}</th>
            <th className="px-4 py-3 text-start font-medium">{t('table.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {roles.map((role) => {
            const permissions = role.permissions ?? [];
            const canDelete = !NON_DELETABLE.has(role.name);
            return (
              <tr key={role._id} className="hover:bg-muted/30 border-b last:border-0">
                <td className="px-4 py-3 font-medium">{role.name}</td>
                <td className="px-4 py-3">
                  <PermissionsTooltip permissions={permissions} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEdit(role)}
                      aria-label={t('table.editAria')}>
                      <IconPencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={!canDelete}
                      title={canDelete ? undefined : t('table.deleteDisabledHint')}
                      onClick={() => onDelete(role)}
                      aria-label={t('table.deleteAria')}>
                      <IconTrash className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
