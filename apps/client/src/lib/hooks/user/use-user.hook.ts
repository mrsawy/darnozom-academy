'use client';

import { useMemo } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
  type InfiniteData,
} from '@/lib/utils';
import { CreateUserFormData, EditUserFormData } from '@/lib/schema/user.schema';
import { CreateUserDto } from '@darnozom/shared-types/dto';
import { UserStatus } from '@darnozom/shared-types';
import { toast } from 'react-toastify';
import { useRouter } from '@/i18n/navigation';
import useGeneralStore from '@/lib/store/generalStore';
import useUserStore from '@/lib/store/userStore';
import { walletKeys } from '@/lib/hooks/wallet/use-wallet';
import { useTranslations } from 'next-intl';
import { translateApiMessage } from '@/lib/utils/errors/translateApiMessage';
import {
  PaginationOptions,
  withDefaults,
  type PaginatedUsersByOrganization,
} from '@/lib/types/Paginated';
import { getUsersByOrganization } from '@/lib/actions/user/getUsersByOrganization.action';
import {
  createUserAction,
  updateOneUserAction,
  updateSelfUserAction,
} from '@/lib/actions/user/user.action';
import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';
import type { IUser } from '@/lib/types/user/user.interface';
import type { Option } from '@/components/molecules/multi-select/multi-select';
import { getAuthUserWithCache } from '@/lib/utils/auth/getAuthUserWithCache';

// Query keys
export const userKeys = {
  all: ['users'] as const,
  organization: () => [...userKeys.all, 'organization'] as const,
  /** Key for infinite/paginated user list (search, page, filters). */
  organizationList: (params: {
    search?: string;
    page: number;
    limit: number;
    roleFilter?: string;
    excludeUserIds?: string[];
  }) => [...userKeys.all, 'organization', 'list', params] as const,
  user: (userId: string) => [...userKeys.all, 'user', userId] as const,
  role: (role: string) => [...userKeys.all, 'role', role] as const,
  status: (status: string) => [...userKeys.all, 'status', status] as const,
  /** Current session user (store-first, then server). */
  me: () => [...userKeys.all, 'me'] as const,
};

const DEFAULT_PAGE_SIZE = 10;

function userToOption(user: IUser): Option {
  return {
    value: user._id,
    label: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || user.username,
  };
}

// Custom hook for fetching users by organization
export function useUsersByOrganization(
  options: PaginationOptions,
  filters?: Record<string, unknown>,
  queryOptions?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: [...userKeys.organization(), options, filters],
    queryFn: async () => {
      const users = await getUsersByOrganization(options, filters);
      return users;
    },
    enabled: queryOptions?.enabled ?? true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: true,
  });
}

export interface UseInfiniteUsersOptions {
  /** Current search term; when it changes, the query key updates and data refetches. */
  search?: string;
  /** Filter users by role (e.g. only students for parent's children). */
  roleFilter?: string;
  /** Exclude these user IDs from the list. */
  excludeUserIds?: string[];
  /** Page size (default 10). */
  pageSize?: number;
}

/**
 * Hook for infinite/paginated user list using useInfiniteQuery. Pass search from the
 * select (e.g. via onSearchChange); when search changes, query params update and
 * new data is fetched. Pass options to the select and fetchNextPage for load more.
 */
export function useInfiniteUsers(opts: UseInfiniteUsersOptions = {}) {
  const { search = '', roleFilter, excludeUserIds = [], pageSize = DEFAULT_PAGE_SIZE } = opts;

  const filters = useMemo(() => {
    const f: Record<string, unknown> = {};
    if (roleFilter) f.roleName = roleFilter;
    if (excludeUserIds.length > 0) f._id = { $nin: excludeUserIds };
    return f;
  }, [roleFilter, excludeUserIds]);

  const infiniteQuery = useInfiniteQuery<
    PaginatedUsersByOrganization<IUser>,
    Error,
    InfiniteData<PaginatedUsersByOrganization<IUser>>,
    readonly unknown[],
    number
  >({
    queryKey: [
      ...userKeys.all,
      'organization',
      'infinite',
      search,
      pageSize,
      roleFilter,
      excludeUserIds,
      filters,
    ],
    queryFn: async ({ pageParam }) => {
      const paginationOptions = withDefaults({
        page: pageParam,
        limit: pageSize,
        search: search || undefined,
      });
      return getUsersByOrganization(
        paginationOptions,
        Object.keys(filters).length > 0 ? filters : undefined
      );
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasNextPage ? (lastPage.nextPage ?? lastPage.page + 1) : undefined,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const options: Option[] = useMemo(
    () => infiniteQuery.data?.pages.flatMap((p) => (p.docs ?? []).map(userToOption)) ?? [],
    [infiniteQuery.data]
  );

  return {
    data: options,
    hasMore: infiniteQuery.hasNextPage ?? false,
    fetchNextPage: infiniteQuery.fetchNextPage,
    isLoading: infiniteQuery.isLoading,
    isFetchingNextPage: infiniteQuery.isFetchingNextPage,
    pageSize,
  };
}

// Custom hook for fetching a single user by the organization
export function useUserByOrganization(userId: string) {
  return useQuery<IUser>({
    queryKey: userKeys.user(userId),
    queryFn: async () => {
      return await createAuthorizedNatsRequest<IUser>('users.getSingleUserByOrganization', {
        filters: { _id: userId },
      });
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/** Current logged-in user for public pages (optional). */
export function useAuthUser() {
  return useQuery<IUser | null>({
    queryKey: userKeys.me(),
    queryFn: async () => (await getAuthUserWithCache()) ?? null,
    staleTime: 2 * 60 * 1000,
    retry: false,
  });
}

/** Payload for create user: shared CreateUserDto (with _id/walletId optional) plus form-only fields. */
export type CreateUserPayload = Omit<CreateUserDto, '_id' | 'walletId'> &
  Partial<Pick<CreateUserDto, '_id' | 'walletId'>> & {
    confirmPassword?: string;
    country?: string;
    organizationId?: string;
    categoriesIds?: string[];
  };

// Custom hook for creating a user
export function useCreateUser() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const tMutations = useTranslations('mutations');
  const tErrors = useTranslations('errors');

  return useMutation({
    mutationFn: async (userData: CreateUserPayload) => {
      return await createUserAction(userData as CreateUserFormData);
    },
    onSuccess: async () => {
      toast.success(tMutations('userCreated'));
      await queryClient.invalidateQueries({ queryKey: userKeys.organization() });
      await queryClient.invalidateQueries({ queryKey: userKeys.all });
      router.push('/organization-dashboard/users');
    },
    onMutate: () => {
      useGeneralStore.setState({ generalIsLoading: true });
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : '';
      toast.error(msg ? translateApiMessage(msg, tErrors) : tMutations('userCreateFailed'));
    },
    onSettled: () => {
      useGeneralStore.setState({ generalIsLoading: false });
    },
  });
}

// Custom hook for updating a user
export function useUpdateUser() {
  const queryClient = useQueryClient();
  const tMutations = useTranslations('mutations');
  const tErrors = useTranslations('errors');

  return useMutation({
    mutationFn: async ({ userId, userData }: { userId: string; userData: EditUserFormData }) => {
      return await updateOneUserAction(userId, userData);
    },
    onSuccess: (_data, variables) => {
      toast.success(tMutations('userUpdated'));
      void queryClient.invalidateQueries({ queryKey: userKeys.user(variables.userId) });
      void queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
    onMutate: () => {
      useGeneralStore.setState({ generalIsLoading: true });
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : '';
      toast.error(msg ? translateApiMessage(msg, tErrors) : tMutations('userUpdateFailed'));
    },
    onSettled: () => {
      useGeneralStore.setState({ generalIsLoading: false });
    },
  });
}

// Custom hook for deleting a user
export function useDeleteUser() {
  const queryClient = useQueryClient();
  const tMutations = useTranslations('mutations');
  const tErrors = useTranslations('errors');

  return useMutation({
    mutationFn: async (userId: string) => {
      return await createAuthorizedNatsRequest('users.organizationDeleteUser', { userId });
    },
    onSuccess: (_data, userId) => {
      queryClient.removeQueries({ queryKey: userKeys.user(userId) });
      void queryClient.invalidateQueries({ queryKey: userKeys.all });
      toast.success(tMutations('userDeleted'));
    },
    onMutate: () => {
      useGeneralStore.setState({ generalIsLoading: true });
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : '';
      toast.error(msg ? translateApiMessage(msg, tErrors) : tMutations('userDeleteFailed'));
    },
    onSettled: () => {
      useGeneralStore.setState({ generalIsLoading: false });
    },
  });
}

// Custom hook for deleting multiple users
export function useDeleteUsers() {
  const queryClient = useQueryClient();
  const tMutations = useTranslations('mutations');
  const tErrors = useTranslations('errors');

  return useMutation({
    mutationFn: async (_userIds: string[]) => {
      // Not yet implemented on the server
    },
    onSuccess: (_data, userIds) => {
      for (const userId of userIds) {
        queryClient.removeQueries({ queryKey: userKeys.user(userId) });
      }
      void queryClient.invalidateQueries({ queryKey: userKeys.all });
      toast.success(tMutations('usersDeleted', { count: userIds.length }));
    },
    onMutate: () => {
      useGeneralStore.setState({ generalIsLoading: true });
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : '';
      toast.error(msg ? translateApiMessage(msg, tErrors) : tMutations('userDeleteFailed'));
    },
    onSettled: () => {
      useGeneralStore.setState({ generalIsLoading: false });
    },
  });
}

// Custom hook for updating user status
export function useUpdateUserStatus() {
  const queryClient = useQueryClient();
  const tMutations = useTranslations('mutations');
  const tErrors = useTranslations('errors');

  return useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: UserStatus }) => {
      return await updateOneUserAction(userId, { status });
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: userKeys.user(variables.userId) });
      void queryClient.invalidateQueries({ queryKey: userKeys.all });
      toast.success(tMutations('userStatusUpdated'));
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : '';
      toast.error(msg ? translateApiMessage(msg, tErrors) : tMutations('userStatusUpdateFailed'));
    },
  });
}

export const selfUserKeys = {
  self: ['self-user'] as const,
};

export function useUpdateSelfUser() {
  const queryClient = useQueryClient();
  const tMutations = useTranslations('mutations');
  const tErrors = useTranslations('errors');

  return useMutation({
    mutationFn: async (userData: Partial<EditUserFormData>) => {
      return await updateSelfUserAction(userData);
    },
    onSuccess: (_result, variables) => {
      void queryClient.invalidateQueries({ queryKey: selfUserKeys.self });
      void queryClient.invalidateQueries({ queryKey: userKeys.me() });
      if (variables.preferredCurrency) {
        const currentUser = useUserStore.getState().user;
        if (currentUser) {
          useUserStore
            .getState()
            .setUser({ ...currentUser, preferredCurrency: variables.preferredCurrency });
        }
        // A currency change also converts the wallet server-side.
        void queryClient.invalidateQueries({ queryKey: walletKeys.all });
      }
      toast.success(tMutations('profileUpdated'));
    },
    onMutate: () => {
      useGeneralStore.setState({ generalIsLoading: true });
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : '';
      toast.error(msg ? translateApiMessage(msg, tErrors) : tMutations('profileUpdateFailed'));
    },
    onSettled: () => {
      useGeneralStore.setState({ generalIsLoading: false });
    },
  });
}

// Helper hook to get user count for an organization
export function useUserCount(_organizationId: string) {
  // const { data: users } = useUsersByOrganization(organizationId);
  // return users?.length ?? 0;
}

// Helper hook to get users by role
export function useUsersByRole(_organizationId: string, _role: string) {
  // const { data: users } = useUsersByOrganization(organizationId);
  // return users?.filter((user) => user.role === role) ?? [];
}

// Helper hook to get users by status
export function useUsersByStatus(_organizationId: string, _status: string) {
  // const { data: users } = useUsersByOrganization(organizationId);
  // return users?.filter((user) => user.status === status) ?? [];
}
