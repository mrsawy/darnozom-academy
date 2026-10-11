import { toast } from 'react-toastify';
import { AccessType } from '@darnozom/shared-types';
import { getEnrollmentByCourse } from '@/lib/actions/enrollment/getEnrollmentByCourse.action';
import { SubscriptionStatus } from '@/lib/types/enrollment/enrollment.interface';
import {
  ROUTE_STUDENT_COURSES,
  ROUTE_STUDENT_COURSE_CONTENT,
} from '@/lib/data/constants/routes.constants';
import { notificationKeys } from '@/lib/hooks/notification/use-notifications.hook';
import type { CourseContentNotificationData } from '@darnozom/shared-types';
import type { NotificationTypeHandler } from '../notification-handler.types';
import { translateNotificationToastText } from '../translate-notification';

function isEnrollmentStillValid(enrollment: {
  accessType: AccessType;
  subscription?: { ends_at?: Date | string; status?: SubscriptionStatus };
}): boolean {
  if (enrollment.accessType !== AccessType.SUBSCRIPTION) return true;
  if (enrollment.subscription?.status === SubscriptionStatus.EXPIRED) return false;
  const endsAt = enrollment.subscription?.ends_at;
  return !endsAt || new Date(endsAt) >= new Date();
}

/** `course_content`: new content became available in a course the student can access. */
export const courseContentNotificationHandler: NotificationTypeHandler = {
  showArrivalToast(notification, t) {
    toast.info(translateNotificationToastText(notification, t));
  },

  async handleClick(notification, { router, queryClient }) {
    const data = notification.data as Partial<CourseContentNotificationData> | undefined;
    if (!data?.courseId || !data.contentId) return;

    const enrollment = await getEnrollmentByCourse(data.courseId).catch(() => null);
    void queryClient.invalidateQueries({ queryKey: notificationKeys.all });

    if (!enrollment?._id || !isEnrollmentStillValid(enrollment)) {
      router.push(ROUTE_STUDENT_COURSES);
      return;
    }

    router.push(ROUTE_STUDENT_COURSE_CONTENT(enrollment._id, data.contentId));
  },
};
