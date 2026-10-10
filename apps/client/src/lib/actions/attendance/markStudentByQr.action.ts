'use server';

import { createAuthorizedNatsRequest, type NatsErr } from '@/lib/utils/createNatsRequest';

export async function markStudentByQr(courseId: string): Promise<void | NatsErr> {
  const result = await createAuthorizedNatsRequest('attendance.studentMarkByQr', {
    dto: { courseId },
  });

  if (result && typeof result === 'object' && 'err' in result) {
    return result as NatsErr;
  }
}
