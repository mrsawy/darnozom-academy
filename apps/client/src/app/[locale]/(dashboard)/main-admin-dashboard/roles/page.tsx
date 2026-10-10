'use client';

import { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { IconLoader2, IconPlus, IconRefresh } from '@tabler/icons-react';
import { Roles } from '@lms-organization/shared-types';
import { Button } from '@/components/atoms/button';
import { DeleteConfirmationModal } from '@/components/molecules/modals';
import {
  useAdminRoles,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
} from '@/lib/hooks/admin-roles/use-admin-roles.hook';
import type { RoleResponse } from '@/lib/actions/role/role.action';
import { RolesTable } from './__components/roles-table';
import { RoleFormDialog } from './__components/role-form-dialog';
import type { RoleFormValues } from './__components/role-form.schema';
import { formPermissionsToPayload } from './__components/role-form.mappers';

export default function AdminRolesPage() {
  const t = useTranslations('AdminRoles');

  const { data: roles, isLoading, isError, refetch } = useAdminRoles();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();

  const [formOpen, setFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleResponse | null>(null);
  const [deletingRole, setDeletingRole] = useState<RoleResponse | null>(null);

  const existingNames = useMemo(() => new Set((roles ?? []).map((r) => r.name)), [roles]);
  const availableNamesForCreate = useMemo(
    () => (Object.values(Roles) as Roles[]).filter((r) => !existingNames.has(r)),
    [existingNames]
  );

  const handleCreate = useCallback(() => {
    setEditingRole(null);
    setFormOpen(true);
  }, []);

  const handleEdit = useCallback((role: RoleResponse) => {
    setEditingRole(role);
    setFormOpen(true);
  }, []);

  const handleFormSubmit = useCallback(
    async (values: RoleFormValues) => {
      const permissions = formPermissionsToPayload(values.permissions);
      if (editingRole) {
        await updateRole.mutateAsync({ id: editingRole._id, data: { permissions } });
      } else {
        const name = values.name as Roles;
        await createRole.mutateAsync({ name, permissions });
      }
      setFormOpen(false);
      setEditingRole(null);
    },
    [editingRole, createRole, updateRole]
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingRole) return;
    await deleteRole.mutateAsync(deletingRole._id);
    setDeletingRole(null);
  }, [deletingRole, deleteRole]);

  const isSubmitting = createRole.isPending || updateRole.isPending;

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-12">
          <IconLoader2 className="text-primary h-8 w-8 animate-spin" />
        </div>
      );
    }

    if (isError) {
      return (
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <p className="text-destructive font-medium">{t('loadError')}</p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            <IconRefresh className="mr-2 h-4 w-4" />
            {t('retry')}
          </Button>
        </div>
      );
    }

    if (roles && roles.length > 0) {
      return <RolesTable roles={roles} onEdit={handleEdit} onDelete={setDeletingRole} />;
    }

    return <p className="text-muted-foreground py-12 text-center">{t('noRoles')}</p>;
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        <Button onClick={handleCreate} disabled={availableNamesForCreate.length === 0}>
          <IconPlus className="mr-2 h-4 w-4" />
          {t('createRole')}
        </Button>
      </div>

      {renderContent()}

      <RoleFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingRole(null);
        }}
        role={editingRole}
        availableNamesForCreate={availableNamesForCreate}
        onSubmit={(values) => void handleFormSubmit(values)}
        isSubmitting={isSubmitting}
      />

      <DeleteConfirmationModal
        open={!!deletingRole}
        onOpenChange={(open) => {
          if (!open) setDeletingRole(null);
        }}
        onConfirm={() => void handleDeleteConfirm()}
        isPending={deleteRole.isPending}
        title={t('deleteConfirm.title')}
        description={t('deleteConfirm.description', { name: deletingRole?.name ?? '' })}
      />
    </div>
  );
}
