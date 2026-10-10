'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Roles } from '@lms-organization/shared-types';
import type { IUser } from '@/lib/types/user/user.interface';
import useUserStore from '@/lib/store/userStore';
import { useUsersByOrganization } from '@/lib/hooks/user/use-user.hook';
import { useCoursesByOrganization } from '@/lib/hooks/course/useCourses';
import { useCompleteOrganizationOnboarding } from '@/lib/hooks/user/use-complete-organization-onboarding.hook';

function resolveOnboardingUser(propUser?: IUser, storeUser?: IUser): IUser | undefined {
  if (propUser && storeUser && propUser._id === storeUser._id) {
    // Store wins for organizationOnboarded so skip/finish dismisses without a full reload.
    return {
      ...propUser,
      ...storeUser,
      organizationOnboarded: storeUser.organizationOnboarded ?? propUser.organizationOnboarded,
    };
  }
  return storeUser ?? propUser;
}

export function useOrganizationOnboarding(user?: IUser) {
  const storeUser = useUserStore((s) => s.user);
  const setUser = useUserStore((s) => s.setUser);
  const effectiveUser = resolveOnboardingUser(user, storeUser);

  const shouldShow =
    effectiveUser?.roleName === Roles.SUPER_ADMIN && effectiveUser.organizationOnboarded === false;

  const completeMutation = useCompleteOrganizationOnboarding();
  const autoCompleteTriggered = useRef(false);
  const [run, setRun] = useState(false);
  const [autoCompleting, setAutoCompleting] = useState(false);
  // Local dismiss so overlay unmounts immediately — don't wait for the mutation.
  const [dismissed, setDismissed] = useState(false);

  // Seed store from layout user after persist rehydration so localStorage
  // cannot stomp a fresh SSR user (which caused intermittent "Organization not found").
  useEffect(() => {
    if (!user) return;

    const apply = () => {
      const current = useUserStore.getState().user;
      if (
        current?._id === user._id &&
        current.organizationOnboarded === true &&
        user.organizationOnboarded !== true
      ) {
        setUser({ ...user, organizationOnboarded: true });
        return;
      }
      setUser(user);
    };

    if (useUserStore.persist.hasHydrated()) {
      apply();
      return;
    }
    return useUserStore.persist.onFinishHydration(apply);
  }, [user, setUser]);

  const instructorsQuery = useUsersByOrganization(
    { page: 1, limit: 1 },
    { roleName: Roles.INSTRUCTOR },
    { enabled: shouldShow && !dismissed }
  );
  const coursesQuery = useCoursesByOrganization(
    { page: 1, limit: 1 },
    { enabled: shouldShow && !dismissed }
  );

  const markOnboardedLocally = useCallback(() => {
    const current = useUserStore.getState().user;
    if (current) {
      setUser({ ...current, organizationOnboarded: true });
    }
    setDismissed(true);
    setRun(false);
  }, [setUser]);

  const complete = useCallback(() => {
    markOnboardedLocally();
    completeMutation.mutate();
  }, [completeMutation, markOnboardedLocally]);

  const skip = useCallback(() => {
    markOnboardedLocally();
    completeMutation.mutate();
  }, [completeMutation, markOnboardedLocally]);

  useEffect(() => {
    if (!shouldShow || dismissed) {
      setRun(false);
      setAutoCompleting(false);
      if (!shouldShow) {
        autoCompleteTriggered.current = false;
        setDismissed(false);
      }
      return;
    }

    setAutoCompleting(true);
    setRun(false);
  }, [shouldShow, dismissed]);

  useEffect(() => {
    if (!shouldShow || dismissed || autoCompleteTriggered.current) return;
    if (instructorsQuery.isLoading || coursesQuery.isLoading) return;

    const hasInstructor = (instructorsQuery.data?.totalDocs ?? 0) >= 1;
    const hasCourse = (coursesQuery.data?.totalDocs ?? 0) >= 1;

    if (hasInstructor && hasCourse) {
      autoCompleteTriggered.current = true;
      markOnboardedLocally();
      completeMutation.mutate();
      return;
    }

    autoCompleteTriggered.current = true;
    setAutoCompleting(false);
    setRun(true);
  }, [
    shouldShow,
    dismissed,
    instructorsQuery.isLoading,
    instructorsQuery.data,
    coursesQuery.isLoading,
    coursesQuery.data,
    completeMutation,
    markOnboardedLocally,
  ]);

  const visible = shouldShow && !dismissed;

  return {
    shouldShow: visible,
    run: visible && run && !autoCompleting,
    setRun,
    complete,
    skip,
  };
}
