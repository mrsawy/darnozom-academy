import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DateTime } from 'luxon';
import {
  MessageTemplateErrors,
  RenderMessageTemplateDto,
  RenderTemplateResult,
  TemplateLocale,
} from '@darnozom/shared-types';
import { Group } from 'src/academics/group/entities/group.entity';
import { Level } from 'src/academics/level/entities/level.entity';
import { TrainingCourse } from 'src/academics/training-course/entities/training-course.entity';
import { User } from 'src/user/entities/user.entity';
import { AcademicsActor } from 'src/academics/common/actor';
import { MessageTemplateService } from './message-template.service';
import { canonicalVariables, renderTemplate, normalizePhone } from '../domain/template-render';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));

const DAY_NAMES: Record<TemplateLocale, string[]> = {
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  ar: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
};

@Injectable()
export class TemplateRenderService {
  constructor(
    private readonly templateService: MessageTemplateService,
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Level.name) private readonly levelModel: Model<Level>,
    @InjectModel(TrainingCourse.name) private readonly courseModel: Model<TrainingCourse>,
  ) {}

  async render(actor: AcademicsActor, templateId: string, dto: RenderMessageTemplateDto): Promise<RenderTemplateResult> {
    const template = await this.templateService.findOne(actor.organizationId, templateId);

    const group = await this.groupModel.findOne({ _id: oid(dto.groupId), organizationId: oid(actor.organizationId) });
    if (!group) throw new NotFoundException(MessageTemplateErrors.TEMPLATE_NOT_FOUND);

    if (template.context === 'STUDENT') {
      if (!dto.studentId) throw new ForbiddenException(MessageTemplateErrors.STUDENT_NOT_IN_GROUP);
      const inGroup = group.students.some(
        (s) => String(s.studentId) === dto.studentId && (s as any).status !== 'REMOVED',
      );
      if (!inGroup) throw new ForbiddenException(MessageTemplateErrors.STUDENT_NOT_IN_GROUP);
    }

    const groupAny = group as any;
    const [level, course, teacher] = await Promise.all([
      this.levelModel.findById(group.levelId).lean<{ name: string } | null>().exec(),
      this.courseModel.findById(groupAny.courseId).lean<{ name: string } | null>().exec(),
      this.userModel.findById(groupAny.teacherId).lean<{ firstName: string; lastName: string } | null>().exec(),
    ]);

    const locale = dto.locale ?? 'en';
    const dayNames = DAY_NAMES[locale];
    const scheduleText = group.schedule
      .map((s) => `${dayNames[s.dayOfWeek]} ${s.startTime}`)
      .join(locale === 'ar' ? ' و ' : ' & ');

    const startDateText = groupAny.startDate
      ? DateTime.fromJSDate(groupAny.startDate as Date)
          .setZone(group.timezone || 'UTC')
          .toISODate() ?? ''
      : '';

    const values: Record<string, string | undefined> = {
      groupName: groupAny.name,
      courseName: course?.name,
      levelName: level?.name,
      teacherName: teacher ? `${teacher.firstName} ${teacher.lastName}` : undefined,
      startDate: startDateText,
      schedule: scheduleText,
      meetingLink: group.meetingLink || undefined,
      whatsappGroupLink: group.whatsappGroupLink || undefined,
    };

    if (template.context === 'STUDENT' && dto.studentId) {
      type NamedUser = { firstName: string; lastName: string; phone?: string };
      const [student, parent] = await Promise.all([
        this.userModel.findById(oid(dto.studentId)).lean<NamedUser | null>().exec(),
        // A parent is the user whose childUsersIds contains this student.
        this.userModel.findOne({ childUsersIds: oid(dto.studentId) }).lean<NamedUser | null>().exec(),
      ]);
      values.studentName = student ? `${student.firstName} ${student.lastName}` : undefined;
      values.parentName = parent ? `${parent.firstName} ${parent.lastName}` : undefined;

      const { text, missingVariables } = renderTemplate(template.body, values);

      // A message that addresses the parent goes to the parent's phone when there is one;
      // otherwise prefer the student's phone. Either way, fall back to the other contact.
      const addressesParent = canonicalVariables(template.body).includes('parentName');
      const candidates: { recipient: 'STUDENT' | 'PARENT'; phone?: string }[] = addressesParent
        ? [{ recipient: 'PARENT', phone: parent?.phone }, { recipient: 'STUDENT', phone: student?.phone }]
        : [{ recipient: 'STUDENT', phone: student?.phone }, { recipient: 'PARENT', phone: parent?.phone }];
      const chosen = candidates.find((c) => c.phone);
      if (chosen?.phone) {
        const phone = normalizePhone(chosen.phone);
        return {
          text,
          missingVariables,
          phone,
          recipient: chosen.recipient,
          waLink: `https://wa.me/${phone}?text=${encodeURIComponent(text)}`,
        };
      }
      return { text, missingVariables };
    }

    const { text, missingVariables } = renderTemplate(template.body, values);
    return { text, missingVariables };
  }
}
