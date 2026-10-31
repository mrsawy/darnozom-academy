'use client';

import { useState, useMemo, useCallback } from 'react';
import { DataTable } from '@/components/molecules/data-table/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { IUser } from '@/lib/types/user/user.interface';
import { Button } from '@/components/atoms/button';
import { IconDotsVertical } from '@tabler/icons-react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/atoms/dialog';
import { SearchInput } from '@/components/molecules/search-input';
import {
  PlusIcon,
  Edit,
  Mail,
  Phone,
  Shield,
  User,
  Crown,
  GraduationCap,
  Users,
} from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { ROUTE_ORG_USERS_CREATE, ROUTE_ORG_USER_EDIT } from '@/lib/data/constants/routes.constants';
import { canUser } from '@/lib/utils/permissions/can';
import useUserStore from '@/lib/store/userStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/atoms/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/atoms/avatar';
import { Badge } from '@/components/atoms/badge';
import { InfoCard } from '@/components/molecules/info-card/info-card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/atoms/select';
import { Actions, Subjects, UserStatus } from '@darnozom/shared-types';
import {
  useDeleteUser,
  useUpdateUserStatus,
  useUsersByOrganization,
} from '@/lib/hooks/user/use-user.hook';
import { getFileFullUrl } from '@/lib/utils/getFileFullUrl';
import { useTranslations } from 'next-intl';

// User role icon mapping
function getRoleIcon(role: string) {
  const roleType = role?.toLowerCase();
  if (roleType?.includes('admin')) return <Shield className="h-4 w-4 text-red-500" />;
  if (roleType?.includes('instructor') || roleType?.includes('teacher'))
    return <GraduationCap className="h-4 w-4 text-blue-500" />;
  if (roleType?.includes('student')) return <User className="h-4 w-4 text-green-500" />;
  if (roleType?.includes('manager')) return <Crown className="h-4 w-4 text-purple-500" />;
  return <Users className="h-4 w-4 text-gray-400" />;
}

// Status color mapping
function getStatusColor(status: string) {
  switch (status?.toLowerCase()) {
    case 'active': {
      return 'bg-green-50 text-green-700 border-green-200';
    }
    case 'inactive': {
      return 'bg-gray-50 text-gray-700 border-gray-200';
    }
    case 'suspended': {
      return 'bg-red-50 text-red-700 border-red-200';
    }
    case 'pending': {
      return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    }
    default: {
      return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  }
}

export default function UserDataTable() {
  const t = useTranslations('UserDataTable');
  const currentUser = useUserStore((s) => s.user);
  const canEditUsers = canUser(currentUser, Actions.UPDATE, Subjects.USER);
  const [openRowId, setOpenRowId] = useState<string | null>(null);
  const [tempStatus, setTempStatus] = useState<UserStatus | null>(null);
  const [globalFilter, setGlobalFilter] = useState<string>('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  // Use custom hooks for user management with pagination and server-side search
  const usersQuery = useUsersByOrganization({
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search: globalFilter.trim() || undefined,
  });
  const users = useMemo(
    () =>
      usersQuery.data ?? {
        docs: [],
        totalPages: 0,
        totalStudents: 0,
        totalParents: 0,
        totalAdmins: 0,
        totalInstructors: 0,
        roleCounts: {},
      },
    [usersQuery.data]
  );
  const isLoading = usersQuery.isLoading;
  const deleteUserMutation = useDeleteUser();
  const updateUserStatusMutation = useUpdateUserStatus();

  // const deleteSelected = useCallback(
  //   (ids: string[]) => {
  //     deleteUsersMutation.mutate(ids);
  //   },
  //   [deleteUsersMutation]
  // );

  const handleDeleteUser = useCallback(
    (userId: string) => {
      deleteUserMutation.mutate(userId);
    },
    [deleteUserMutation]
  );

  // Handle opening the dialog and initializing temp status
  const handleOpenStatusDialog = useCallback(
    (userId: string) => {
      const user = users.docs.find((u) => u._id === userId);
      if (user) {
        setTempStatus(user.status ?? UserStatus.ACTIVE);
        setOpenRowId(userId);
      }
    },
    [users]
  );

  // Handle closing dialog and resetting temp state
  const handleCloseDialog = useCallback(() => {
    setOpenRowId(null);
    setTempStatus(null);
  }, []);

  // Handle saving status changes
  const handleSaveStatus = useCallback(
    (userId: string) => {
      updateUserStatusMutation.mutate(
        {
          userId,
          status: tempStatus ?? UserStatus.ACTIVE,
        },
        {
          onSuccess: () => handleCloseDialog(),
        }
      );
    },
    [tempStatus, handleCloseDialog, updateUserStatusMutation]
  );

  // Get user's initials for avatar fallback
  const getUserInitials = useCallback((firstName: string, lastName: string) => {
    return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase();
  }, []);

  // Format last login date
  const formatLastLogin = useCallback(
    (date: Date | string | null | undefined) => {
      if (!date) return t('never');
      const now = new Date();
      const loginDate = new Date(date);
      const diffMs = now.getTime() - loginDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return t('today');
      if (diffDays === 1) return t('yesterday');
      if (diffDays < 7) return t('daysAgo', { count: diffDays });

      return loginDate.toLocaleDateString();
    },
    [t]
  );

  // Memoize columns to prevent re-renders
  const columns: ColumnDef<IUser>[] = useMemo(
    () => [
      // {
      //   id: 'select',
      //   header: ({ table }) => (
      //     <div className="ms-4 flex items-center justify-center">
      //       <Checkbox
      //         checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
      //         onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
      //         aria-label={t('selectAll')}
      //         className="border-primary"
      //       />
      //     </div>
      //   ),
      //   cell: ({ row }) => (
      //     <div className="my-3 ms-4 flex items-center justify-center">
      //       <Checkbox
      //         checked={row.getIsSelected()}
      //         onCheckedChange={(value) => row.toggleSelected(!!value)}
      //         aria-label={t('selectRow')}
      //         className="border-primary"
      //       />
      //     </div>
      //   ),
      //   enableSorting: false,
      //   enableHiding: false,
      // },
      {
        accessorKey: 'user',
        header: t('user'),
        cell: ({ row }) => {
          const user = row.original;
          return (
            <div className="flex w-[250px] items-center gap-3">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage
                  src={getFileFullUrl(user.profile?.avatar)}
                  alt={`${user.firstName} ${user.lastName}`}
                />
                <AvatarFallback>{getUserInitials(user.firstName, user.lastName)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="truncate font-medium" title={`${user.firstName} ${user.lastName}`}>
                  {user.firstName} {user.lastName}
                </div>
                <div className="text-muted-foreground truncate text-sm" title={`@${user.username}`}>
                  @{user.username}
                </div>
              </div>
            </div>
          );
        },
        enableHiding: false,
      },
      {
        accessorKey: 'email',
        header: t('contact'),
        cell: ({ row }) => (
          <div className="w-[250px] space-y-1">
            <div className="flex min-w-0 items-center gap-2">
              <Mail className="text-muted-foreground h-3 w-3 shrink-0" />
              <span className="truncate text-sm" title={row.original.email}>
                {row.original.email}
              </span>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <Phone className="text-muted-foreground h-3 w-3 shrink-0" />
              <span className="truncate text-sm" title={row.original.phone}>
                {row.original.phone}
              </span>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'role',
        header: t('role'),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            {getRoleIcon(row.original.roleName)}
            <span className="capitalize">{row.original.roleName}</span>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: t('status'),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(row.original.status as string)}>
              {row.original.status}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenStatusDialog(row.original._id)}
              className="h-auto p-0 text-xs text-blue-600 hover:text-blue-800">
              {t('change')}
            </Button>
          </div>
        ),
      },
      {
        accessorKey: 'lastLogin',
        header: t('lastLogin'),
        cell: ({ row }) => {
          return (
            <span className="text-muted-foreground text-sm">
              {formatLastLogin(row.original.lastLogin as Date | string | null | undefined)}
            </span>
          );
        },
      },
      {
        accessorKey: 'createdAt',
        header: t('joined'),
        cell: ({ row }) => {
          const createdAt = row.original.createdAt;
          const date = createdAt ? new Date(createdAt) : null;
          return (
            <span className="text-muted-foreground text-sm">
              {date ? date.toLocaleDateString() : t('nA')}
            </span>
          );
        },
      },
      {
        id: 'actions',
        accessorKey: 'actions',
        header: t('actions'),
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
                size="icon">
                <IconDotsVertical />
                <span className="sr-only">{t('openMenu')}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-full cursor-pointer">
              {canEditUsers ? (
                <Link
                  href={ROUTE_ORG_USER_EDIT(row.original._id)}
                  className="flex w-full cursor-pointer items-center">
                  <DropdownMenuItem className="w-full cursor-pointer">
                    <Edit className="mr-2 size-4" />
                    {t('edit')}
                  </DropdownMenuItem>
                </Link>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => handleDeleteUser(row.original._id)}
                className="cursor-pointer">
                {t('deleteUser')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [handleOpenStatusDialog, handleDeleteUser, getUserInitials, formatLastLogin, t, canEditUsers]
  );

  // Show error state
  if (usersQuery.error) {
    const err = usersQuery.error;
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between p-5">
          <h2 className="text-xl font-medium">{t('users')}</h2>
        </div>
        <div className="flex items-center justify-center p-8">
          <div className="text-red-500">{t('errorLoadingUsers', { message: err.message })}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between p-5">
        <div>
          <h2 className="text-xl font-medium">{t('users')}</h2>
          <p className="text-muted-foreground text-sm">
            {t('manageUsers', { count: users.docs.length })}
          </p>
        </div>
        <div data-onboarding="org-create-user" className="inline-flex rounded-xl p-1.5">
          <Button asChild variant="default" size="default" className="h-10 px-5 text-sm shadow-md">
            <Link href={ROUTE_ORG_USERS_CREATE} className="inline-flex cursor-pointer">
              <PlusIcon className="mr-2 h-4 w-4" />
              {t('addUser')}
            </Link>
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center space-x-2 p-5">
        <SearchInput
          placeholder={t('searchUsers')}
          value={globalFilter}
          onChange={(e) => {
            setGlobalFilter(e.target.value);
            setPagination((prev) => ({ ...prev, pageIndex: 0 }));
          }}
          className="ms-auto max-w-sm flex-1"
        />
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 md:grid-cols-4">
        <InfoCard
          title={t('students')}
          icon={<User />}
          count={users.totalStudents ?? 0}
          isLoading={usersQuery.isLoading}
          countClassName="text-purple-600"
          iconClassName="text-purple-500"
        />
        <InfoCard
          title={t('parents')}
          icon={<Users />}
          count={users.totalParents ?? 0}
          isLoading={usersQuery.isLoading}
          countClassName="text-amber-600"
          iconClassName="text-amber-500"
        />
        <InfoCard
          title={t('admins')}
          icon={<Shield />}
          count={users.totalAdmins ?? 0}
          isLoading={usersQuery.isLoading}
          countClassName="text-red-600"
          iconClassName="text-red-500"
        />
        <InfoCard
          title={t('instructors')}
          icon={<GraduationCap />}
          count={users.totalInstructors ?? 0}
          isLoading={usersQuery.isLoading}
          countClassName="text-blue-600"
          iconClassName="text-blue-500"
        />
      </div>

      <DataTable<IUser>
        data={users.docs}
        columns={columns}
        getRowId={(row) => row._id}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        isLoading={isLoading}
        onChangeData={() => {
          // no-op function for data change callback
        }}
        pageSize={pagination.pageSize}
        manualPagination
        pageCount={users.totalPages}
        pagination={pagination}
        onPaginationChange={setPagination}
      />

      {/* Status Change Dialog */}
      <Dialog
        open={!!openRowId}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseDialog();
          }
        }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('changeUserStatus')}</DialogTitle>
            <DialogDescription>{t('updateUserStatus')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="status-select" className="text-sm font-medium">
                {t('status')}
              </label>
              <Select
                value={tempStatus ?? UserStatus.ACTIVE}
                onValueChange={(value: string) => setTempStatus(value as UserStatus)}>
                <SelectTrigger id="status-select">
                  <SelectValue placeholder={t('selectStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UserStatus.ACTIVE}>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      {t('active')}
                    </div>
                  </SelectItem>
                  <SelectItem value={UserStatus.INACTIVE}>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-gray-500" />
                      {t('inactive')}
                    </div>
                  </SelectItem>
                  <SelectItem value={UserStatus.SUSPENDED}>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-red-500" />
                      {t('suspended')}
                    </div>
                  </SelectItem>
                  <SelectItem value={UserStatus.DELETED}>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-red-900" />
                      {t('deleted')}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {tempStatus === UserStatus.SUSPENDED && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-800">
                  <strong>{t('warningSuspended')}</strong>
                </p>
              </div>
            )}

            {tempStatus === UserStatus.INACTIVE && (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                <p className="text-sm text-yellow-800">
                  <strong>{t('noteInactive')}</strong>
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" onClick={handleCloseDialog}>
                {t('cancel')}
              </Button>
            </DialogClose>
            <Button
              type="button"
              onClick={() => openRowId && handleSaveStatus(openRowId)}
              disabled={updateUserStatusMutation.isPending}>
              {updateUserStatusMutation.isPending ? t('updatingStatus') : t('updateStatus')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
