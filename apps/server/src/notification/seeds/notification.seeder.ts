import { Model } from 'mongoose';
import { faker } from '@faker-js/faker';
import { Notification } from '../entities/notification.entity';
import { User } from '../../user/entities/user.entity';
import { Roles, NotificationType, NotificationTextKey } from '@darnozom/shared-types';

interface NotificationTemplate {
  type: NotificationType;
  titleKey: NotificationTextKey;
  bodyKey: NotificationTextKey;
}

// Demo/dev seed data only. The entity stores i18n keys, not literal text, and the small
// NotificationTextKey set doesn't have a dedicated key per seed scenario (enrollment, quiz,
// live session, etc.), so these reuse the closest generic key for valid, renderable seed rows.
const STUDENT_TEMPLATES: NotificationTemplate[] = [
  {
    type: NotificationType.COURSE_CONTENT,
    titleKey: NotificationTextKey.COURSE_CONTENT_TITLE,
    bodyKey: NotificationTextKey.COURSE_CONTENT_BODY,
  },
  {
    type: NotificationType.COURSE_CONTENT,
    titleKey: NotificationTextKey.COURSE_CONTENT_TITLE,
    bodyKey: NotificationTextKey.COURSE_CONTENT_BODY,
  },
  {
    type: NotificationType.COURSE_COMPLETED,
    titleKey: NotificationTextKey.COURSE_COMPLETED_TITLE,
    bodyKey: NotificationTextKey.COURSE_COMPLETED_BODY,
  },
  {
    type: NotificationType.CHAT,
    titleKey: NotificationTextKey.CHAT_MESSAGE_TITLE,
    bodyKey: NotificationTextKey.CHAT_MESSAGE_BODY,
  },
  {
    type: NotificationType.COURSE_CONTENT,
    titleKey: NotificationTextKey.COURSE_CONTENT_TITLE,
    bodyKey: NotificationTextKey.COURSE_CONTENT_BODY,
  },
  {
    type: NotificationType.INFO,
    titleKey: NotificationTextKey.COURSE_CONTENT_TITLE,
    bodyKey: NotificationTextKey.COURSE_CONTENT_BODY,
  },
];

const INSTRUCTOR_TEMPLATES: NotificationTemplate[] = [
  {
    type: NotificationType.COURSE_CONTENT,
    titleKey: NotificationTextKey.COURSE_CONTENT_TITLE,
    bodyKey: NotificationTextKey.COURSE_CONTENT_BODY,
  },
  {
    type: NotificationType.COURSE_COMPLETED,
    titleKey: NotificationTextKey.COURSE_COMPLETED_TITLE,
    bodyKey: NotificationTextKey.COURSE_COMPLETED_BODY,
  },
  {
    type: NotificationType.COURSE_CONTENT,
    titleKey: NotificationTextKey.COURSE_CONTENT_TITLE,
    bodyKey: NotificationTextKey.COURSE_CONTENT_BODY,
  },
  {
    type: NotificationType.INFO,
    titleKey: NotificationTextKey.COURSE_CONTENT_TITLE,
    bodyKey: NotificationTextKey.COURSE_CONTENT_BODY,
  },
];

export class NotificationSeeder {
  constructor(private readonly notificationModel: Model<Notification>) {}

  async seedForUsers(users: User[]) {
    if (users.length === 0) return;

    const docs: Partial<Notification>[] = [];

    for (const user of users) {
      const isInstructor = user.roleName === Roles.INSTRUCTOR;
      const templates = isInstructor ? INSTRUCTOR_TEMPLATES : STUDENT_TEMPLATES;
      const count = faker.number.int({ min: 2, max: 6 });
      const selected = faker.helpers.arrayElements(templates, count);

      for (const tpl of selected) {
        docs.push({
          userId: user._id,
          titleKey: tpl.titleKey,
          bodyKey: tpl.bodyKey,
          type: tpl.type,
          read: faker.datatype.boolean({ probability: 0.4 }),
          createdAt: faker.date.recent({ days: 30 }),
          updatedAt: new Date(),
        } as unknown as Partial<Notification>);
      }
    }

    if (docs.length > 0) {
      await this.notificationModel.insertMany(docs);
    }
  }
}
