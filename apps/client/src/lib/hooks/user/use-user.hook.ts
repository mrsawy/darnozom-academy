'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/axios';
import { IUser } from '@/types/user/user.interface';

async function fetchCurrentUser(): Promise<IUser> {
  const { data } = await api.get<IUser>('/user');
  return data;
}

/** Fetches the currently authenticated user via this app's own `/api/user` route. */
export function useUser() {
  return useQuery({
    queryKey: ['user'],
    queryFn: fetchCurrentUser,
    retry: false,
  });
}
