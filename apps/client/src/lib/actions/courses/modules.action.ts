'use server';

import { ICourseWithModules, PublishStatus } from '@/lib/types/course/course.interface';
import { CreateModuleSchema, UpdateModuleSchema } from '@/lib/schema/module.schema';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';
import { isNatsErrorResponse } from '@/lib/utils/natsErrorHandler';
import { IModule, IModuleWithContents } from '@/lib/types/course/modules.interface';

function isRedirectError(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === 'object' &&
    'digest' in error &&
    typeof error.digest === 'string' &&
    error.digest.startsWith('NEXT_REDIRECT')
  );
}

async function handlePageRevalidation(): Promise<void> {
  const headersList = await headers();
  const referer = headersList.get('referer');

  if (referer) {
    const url = new URL(referer);
    const pathname = url.pathname;
    revalidatePath(pathname);
  }
}

async function handlePageRevalidationWithRedirect(): Promise<void> {
  const headersList = await headers();
  const referer = headersList.get('referer');

  if (referer) {
    const url = new URL(referer);
    const pathname = url.pathname;
    revalidatePath(pathname);
    redirect(pathname);
  }
}

// Course operations
export async function getCourseWithModules(courseId: string, requireApproved = true) {
  try {
    return await createAuthorizedNatsRequest<ICourseWithModules>('courses.getCourseWithModule', {
      courseId,
      requireApproved,
    });
  } catch {
    throw new Error('Failed to get course with modules');
  }
}

// Module operations
export async function createCourseModule(params: CreateModuleSchema & { courseId: string }) {
  try {
    return await createAuthorizedNatsRequest('course.createModule', params);
  } catch (error: unknown) {
    if (isRedirectError(error)) {
      return;
    }
    throw new Error('Failed to create module');
  }
}

export async function getModule(moduleId: string) {
  return await createAuthorizedNatsRequest<IModuleWithContents>('course.getModule', { moduleId });
}

export async function updateModule(moduleId: string, updateData: UpdateModuleSchema) {
  try {
    const response = await createAuthorizedNatsRequest('course.updateModule', {
      moduleId,
      ...updateData,
    });

    // Return NATS errors immediately — don't redirect on failure
    if (isNatsErrorResponse(response)) {
      return response;
    }

    await handlePageRevalidationWithRedirect();
    return response;
  } catch (error: unknown) {
    if (isRedirectError(error)) {
      return;
    }
    throw new Error('Failed to update module');
  }
}

export async function deleteModule(moduleId: string) {
  try {
    const response = await createAuthorizedNatsRequest('course.deleteModule', { moduleId });
    await handlePageRevalidation();
    return response;
  } catch {
    throw new Error('Failed to delete module');
  }
}

export async function deleteModules(moduleIds: string[]) {
  try {
    const response = await createAuthorizedNatsRequest('course.deleteModules', { moduleIds });
    await handlePageRevalidation();
    return response;
  } catch {
    throw new Error('Failed to delete modules');
  }
}

export async function reorderCourseModules(courseId: string, newOrder: string[]) {
  const response = await createAuthorizedNatsRequest<{ message: string; updated: boolean }>(
    'courses.reorderModules',
    {
      courseId,
      newOrder,
    }
  );
  await handlePageRevalidation();
  return response;
}

export async function reorderModuleContents(moduleId: string, newOrder: string[]) {
  const response = await createAuthorizedNatsRequest<{ message: string; updated: boolean }>(
    'course.reorderContents',
    {
      moduleId,
      newOrder,
    }
  );
  await handlePageRevalidation();
  return response;
}

export async function setModulePublishStatus(moduleId: string, publishStatus: PublishStatus) {
  const response = await createAuthorizedNatsRequest<{ success: boolean; data: IModule }>(
    'course.updateModule',
    { moduleId, publishStatus }
  );
  await handlePageRevalidation();
  return response;
}
