'use server';

import { randomUUID } from 'node:crypto';
import { deleteFromS3, getCookie } from '@/lib/utils/serverUtils';
import { connectToNats, request } from '@/lib/nats/client';
import { revalidatePath } from 'next/cache';
import { CourseContentFormData } from '@/lib/schema/content.schema';
import { IContent } from '@/lib/types/course/content.interface';
import { CourseContentType, PublishStatus } from '@darnozom/shared-types';
import { IModuleWithContents } from '@/lib/types/course/modules.interface';
import { AUTH_COOKIE_NAME } from '@/lib/data/constants';
import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';
import {
  GetQuizSubmissionsForOrganizationResponse,
  GetStudentQuizSubmissionsResponse,
  SubmitQuizDto,
  SubmitQuizResponse,
} from '@/lib/types/course/DTO/quizSubmission.dto';
import {
  SubmitAssignmentPayload,
  GetAssignmentSubmissionsResponse,
  GradeAssignmentPayload,
  GradeAssignmentResponse,
} from '@/lib/types/course/DTO/assignmentSubmission.dto';
import { natsErrorHandler, isNatsErrorResponse } from '@/lib/utils/natsErrorHandler';
import { IEnrollment, IEnrollmentProgress } from '@/lib/types/enrollment/enrollment.interface';
import type { ListOrganizationContentsResult } from '@/lib/types/course/organization-contents-list.types';

export async function createContent(
  moduleId: string,
  courseId: string,
  data: CourseContentFormData,
  fileKey?: string
) {
  try {
    const natsClient = await connectToNats();
    const idToken = await getCookie(AUTH_COOKIE_NAME);
    if (!idToken) throw new Error('No Token Provided');
    const { content, ...baseData } = data;
    const response = await request<{
      message: string;
      createdContent: IContent;
    }>(
      natsClient,
      'course.createContent',
      JSON.stringify({
        id: randomUUID(),
        data: {
          authorization: idToken,
          moduleId,
          courseId,
          ...baseData,
          ...content,
        },
      })
    );

    if (isNatsErrorResponse(response)) {
      // Throw so the mutation rejects and the catch block below cleans up the
      // uploaded file. Previously this returned a fake success object, which made
      // React Query fire onSuccess and navigate to `/content/undefined/edit`.
      throw new Error(response.err.message);
    }
    const result = natsErrorHandler(response);
    revalidatePath(`/organization-dashboard/courses/${courseId}/modules/${moduleId}/content`);
    revalidatePath(
      `/organization-dashboard/courses/${courseId}/modules/${moduleId}/content/${result.createdContent._id}`
    );
    return result.createdContent;
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'digest' in error &&
      typeof error.digest === 'string' &&
      error.digest.startsWith('NEXT_REDIRECT')
    ) {
      return;
    }
    if (fileKey) await deleteFromS3(fileKey);
    throw new Error(error instanceof Error ? error.message : 'Failed to create content');
  }
}

export async function getContent(contentId: string) {
  return await createAuthorizedNatsRequest<IContent>('course.getContent', { contentId });
}

export async function getContentsByModuleId(moduleId: string) {
  return await createAuthorizedNatsRequest<IModuleWithContents>('course.getContentsByModuleId', {
    moduleId,
  });
}

export async function listContentsForOrganization(params: {
  type: CourseContentType;
  page?: number;
  limit?: number;
}) {
  return await createAuthorizedNatsRequest<
    ListOrganizationContentsResult,
    { type: CourseContentType; page?: number; limit?: number }
  >('course.listContentsForOrganization', params);
}

export async function deleteContentById(contentId: string) {
  return await createAuthorizedNatsRequest<{ message: string }>('course.deleteContent', {
    contentId,
  });
}

export async function updateContent(contentId: string, updatedData: Partial<IContent>) {
  return await createAuthorizedNatsRequest<IContent>('course.updateContent', {
    contentId,
    ...updatedData,
  });
}

export async function setContentPublishStatus(contentId: string, publishStatus: PublishStatus) {
  const response = await createAuthorizedNatsRequest<{ success: boolean; data: IContent }>(
    'course.updateContent',
    { contentId, publishStatus }
  );
  revalidatePath('/');
  return response;
}

export async function submitQuizAction(submission: SubmitQuizDto) {
  return await createAuthorizedNatsRequest<SubmitQuizResponse, SubmitQuizDto>(
    'enrollment.submitQuiz',
    submission
  );
}

export async function getStudentQuizSubmissionsAction(quizContentId: string) {
  return await createAuthorizedNatsRequest<
    GetStudentQuizSubmissionsResponse,
    { quizContentId: string }
  >('course.getStudentQuizSubmissions', {
    quizContentId,
  });
}

export async function getQuizSubmissionsForOrganizationAction(
  quizContentId: string,
  params?: { page?: number; limit?: number }
) {
  return await createAuthorizedNatsRequest<
    GetQuizSubmissionsForOrganizationResponse,
    { quizContentId: string; page?: number; limit?: number }
  >('course.getQuizSubmissionsForOrganization', {
    quizContentId,
    page: params?.page,
    limit: params?.limit,
  });
}

export async function submitAssignmentAction(payload: SubmitAssignmentPayload) {
  return await createAuthorizedNatsRequest<
    { message: string; assignmentId: string },
    SubmitAssignmentPayload
  >('enrollment.submitAssignment', payload);
}

export async function getAssignmentSubmissionsAction(payload: {
  assignmentId: string;
  studentId?: string;
  enrollmentId?: string;
  locale?: string;
  /** When true, returns paginated `submissions` for all students (org/instructor). */
  allSubmissions?: boolean;
  page?: number;
  limit?: number;
}) {
  revalidatePath(
    `/${payload.locale ?? 'ar'}/student-dashboard/courses/${payload.enrollmentId}/${payload.assignmentId}`
  );
  return await createAuthorizedNatsRequest<GetAssignmentSubmissionsResponse, typeof payload>(
    'course.getAssignmentSubmissions',
    payload
  );
}

export async function gradeAssignmentAction(payload: GradeAssignmentPayload) {
  return await createAuthorizedNatsRequest<GradeAssignmentResponse, GradeAssignmentPayload>(
    'course.gradeAssignment',
    payload
  );
}

/** Deletes an assignment template file from S3 by key. Call when user removes the template and saves. */
export async function deleteAssignmentTemplateFromS3(fileKey: string) {
  if (!fileKey?.trim()) return;
  await deleteFromS3(fileKey.trim());
}

// ____________
// this is used to get a single content in an enrollment without the course data (by the student)
export async function getSingleContentInEnrollment(enrollmentId: string, contentId: string) {
  const raw = await createAuthorizedNatsRequest<{
    enrollment: IEnrollment;
    content: IContent;
  }>('enrollment.getSingleContentInEnrollment', { enrollmentId, contentId });

  // Propagate NATS error objects so the client-side throwIfNatsError wrapper can handle them
  if (isNatsErrorResponse(raw)) {
    return raw as unknown as {
      enrollment: IEnrollment;
      content: IContent;
      progress: IEnrollmentProgress;
    };
  }

  const { enrollment, content } = raw as {
    enrollment: IEnrollment;
    content: IContent;
  };
  const progress = enrollment.progress;

  return {
    enrollment,
    content,
    progress,
  };
}
