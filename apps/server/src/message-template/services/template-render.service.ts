import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DateTime } from 'luxon';
import { MessageTemplateErrors, RenderMessageTemplateDto, RenderTemplateResult } from '@darnozom/shared-types';
import { Group } from 'src/academics/group/entities/group.entity';
import { Level } from 'src/academics/level/entities/level.entity';
import { Course } from 'src/course/entities/course.entity';
import { User } from 'src/user/entities/user.entity';
import { AcademicsActor } from 'src/academics/common/actor';
import { MessageTemplateService } from './message-template.service';
import { renderTemplate, normalizePhone } from '../domain/template-render';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

@Injectable()
export class TemplateRenderService {
  constructor(
    private readonly templateService: MessageTemplateService,
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Level.name) private readonly levelModel: Model<Level>,
    @InjectModel(Course.name) private readonly courseModel: Model<Course>,
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

    const scheduleText = group.schedule
      .map((s) => `${DAY_NAMES[s.dayOfWeek]} ${s.startTime}`)
      .join(' & ');

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
      const student = await this.userModel
        .findById(oid(dto.studentId))
        .lean<{ firstName: string; lastName: string; phone?: string; childUsersIds?: Types.ObjectId[] }>()
        .exec();
      values.studentName = student ? `${student.firstName} ${student.lastName}` : undefined;

      const { text, missingVariables } = renderTemplate(template.body, values);
      const rawPhone = student?.phone;
      if (rawPhone) {
        const phone = normalizePhone(rawPhone);
        return { text, missingVariables, phone, waLink: `https://wa.me/${phone}?text=${encodeURIComponent(text)}` };
      }
      return { text, missingVariables };
    }

    const { text, missingVariables } = renderTemplate(template.body, values);
    return { text, missingVariables };
  }
}
