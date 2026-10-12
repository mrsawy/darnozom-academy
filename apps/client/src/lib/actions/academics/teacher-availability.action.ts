'use server';

import type { AvailabilitySlot } from '@darnozom/shared-types';
import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';
import type { ITeacherAvailability } from '@/lib/types/academics/academics';

export async function getMyAvailability() {
  return createAuthorizedNatsRequest<ITeacherAvailability>('academics.teacherAvailability.getMine', {});
}
export async function saveMyAvailability(data: { timezone: string; slots: AvailabilitySlot[] }) {
  return createAuthorizedNatsRequest<ITeacherAvailability>('academics.teacherAvailability.putMine', data);
}
