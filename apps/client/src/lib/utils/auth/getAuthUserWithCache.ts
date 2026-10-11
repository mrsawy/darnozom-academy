import { Roles } from '@darnozom/shared-types';
import { getAuthUser } from '@/lib/actions/user/user.action';
import useUserStore from '@/lib/store/userStore';
import type { IUser } from '@/lib/types/user/user.interface';
import { resolveOrganizationStoragePath } from '@/lib/utils/auth/resolve-organization-storage-path';

const ORG_SCOPED_ROLES = new Set<Roles>([
  Roles.SUPER_ADMIN,
  Roles.ADMIN,
  Roles.INSTRUCTOR,
  Roles.SECRETARY,
]);

function waitForUserStoreHydration(): Promise<void> {
  const persistApi = useUserStore.persist;
  if (persistApi.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    const unsub = persistApi.onFinishHydration(() => {
      unsub();
      resolve();
    });
  });
}

function shouldHaveOrganization(user: IUser): boolean {
  return ORG_SCOPED_ROLES.has(user.roleName) || !!user.organizationId;
}

/**
 * Gets the current user, preferring the persisted Zustand store (localStorage).
 * Use this from client components when you want instant user data from cache.
 * Falls back to the server getAuthUser() and updates the store when needed.
 *
 * For server components / server actions, use getAuthUser() directly (server cannot read localStorage).
 */
export async function getAuthUserWithCache(): Promise<IUser | undefined> {
  // Avoid racing Zustand persist rehydration (empty store → fetch → then localStorage stomps).
  await waitForUserStoreHydration();

  const cached = useUserStore.getState().user;
  if (cached) {
    const hasOrgPath = resolveOrganizationStoragePath(cached).length > 0;
    if (hasOrgPath || !shouldHaveOrganization(cached)) {
      return cached;
    }
    // Org-scoped user in cache without slug/_id/organizationId — refresh from server.
  }

  const user = await getAuthUser();
  if (user) useUserStore.getState().setUser(user);
  return user ?? cached;
}

/**
 * Resolves an org storage path for uploads. Uses cache first, then a fresh
 * server user when the populated organization object is missing intermittently.
 */
export async function resolveOrgUploadPath(): Promise<string> {
  let user = await getAuthUserWithCache();
  let orgPath = resolveOrganizationStoragePath(user);
  if (!orgPath) {
    user = await getAuthUser();
    if (user) useUserStore.getState().setUser(user);
    orgPath = resolveOrganizationStoragePath(user);
  }
  return orgPath;
}
