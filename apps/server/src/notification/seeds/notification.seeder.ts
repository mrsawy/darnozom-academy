import { Model } from 'mongoose';
import { faker } from '@faker-js/faker';
import { Notification } from '../entities/notification.entity';
import { User } from '../../user/entities/user.entity';
import { Roles } from '@lms-organization/shared-types';

interface NotificationTemplate {
  type: string;
  title: string;
  body: string;
}

const STUDENT_TEMPLATES: NotificationTemplate[] = [
  { type: 'enrollment', title: 'تم تسجيلك في دورة جديدة', body: 'تمت إضافتك إلى دورة بنجاح. ابدأ التعلم الآن!' },
  { type: 'assignment', title: 'تم تقييم تكليفك', body: 'راجع التغذية الراجعة من المدرب على آخر تكليف.' },
  { type: 'quiz', title: 'نتيجة الاختبار متاحة', body: 'تم تقييم اختبارك. اطلع على نتيجتك.' },
  { type: 'live_session', title: 'جلسة مباشرة قادمة', body: 'تُبدأ الجلسة المباشرة خلال ساعة.' },
  { type: 'course_update', title: 'تحديث جديد في الدورة', body: 'أضاف المدرب محتوى جديداً.' },
  { type: 'info', title: 'مرحباً بك في المنصة', body: 'استكشف الدورات المتاحة وابدأ رحلتك التعليمية.' },
];

const INSTRUCTOR_TEMPLATES: NotificationTemplate[] = [
  { type: 'enrollment', title: 'طالب جديد انضم لدورتك', body: 'انضم طالب جديد إلى إحدى دوراتك.' },
  { type: 'review', title: 'تقييم جديد على دورتك', body: 'أضاف أحد الطلاب تقييماً لدورتك. اطلع عليه.' },
  { type: 'assignment', title: 'تكليف جديد بانتظار المراجعة', body: 'قدّم أحد الطلاب تكليفاً يحتاج مراجعتك.' },
  { type: 'info', title: 'نصيحة لتحسين الدورة', body: 'أضف المزيد من الفيديوهات لزيادة تفاعل الطلاب.' },
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
          title: tpl.title,
          body: tpl.body,
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
