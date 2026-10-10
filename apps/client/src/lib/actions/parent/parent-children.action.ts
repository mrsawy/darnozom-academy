'use server';

import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';
import type {
  IChild,
  ICreateChildDto,
  ICreateParentDto,
  ILinkedParentInfo,
  IUpdateChildDto,
} from '@/lib/types/parent/parent-children.interface';

export async function getChildren() {
  return createAuthorizedNatsRequest<IChild[]>('parents.getChildren', {});
}

export async function createChild(dto: ICreateChildDto) {
  return createAuthorizedNatsRequest<IChild>('parents.createChild', dto, false);
}

export async function updateChild(childId: string, data: IUpdateChildDto) {
  return createAuthorizedNatsRequest<{ message: string }>('parents.updateChild', { childId, data });
}

export async function getParentData() {
  return createAuthorizedNatsRequest<ILinkedParentInfo | null>('parents.getParentData', {});
}

export async function createParentForStudent(dto: ICreateParentDto) {
  return createAuthorizedNatsRequest<{ message: string }>(
    'parents.createParentForStudent',
    dto,
    false
  );
}
