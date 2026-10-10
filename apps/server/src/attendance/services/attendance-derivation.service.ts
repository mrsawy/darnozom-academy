import { Injectable, NotFoundException } from '@nestjs/common';
import { CourseService } from '../../course/services/course/course.service';
import { TimeSlot } from '../../course/entities/course.entity';
import { ExpectedSession } from '../types/attendance.types';

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

@Injectable()
export class AttendanceDerivationService {
  constructor(private readonly courseService: CourseService) {}

  async getExpectedSessions(courseId: string, range: { from: Date; to: Date }): Promise<ExpectedSession[]> {
    const course = await this.courseService.findOneById(courseId);
    if (!course) throw new NotFoundException('Course not found');

    const slots: TimeSlot[] = course.attendanceSettings?.offlineSchedule ?? [];
    const activeSlots = slots.filter((s) => !s.deletedAt && s._id && (s.studentsIds ?? []).length > 0);

    const from = new Date(range.from);
    from.setHours(0, 0, 0, 0);
    const to = new Date(range.to);
    to.setHours(23, 59, 59, 999);

    const sessions: ExpectedSession[] = [];
    const cur = new Date(from);

    while (cur <= to) {
      const dayLabel = WEEKDAY_NAMES[cur.getDay()];
      for (const slot of activeSlots) {
        if ((slot.dayOfWeek ?? '').trim() !== dayLabel) continue;

        const dayStart = new Date(cur);
        dayStart.setHours(0, 0, 0, 0);
        const startsAt = this.parseTimeOnDate(dayStart, slot.startTime);
        const endsAt = this.parseTimeOnDate(dayStart, slot.endTime);
        if (endsAt.getTime() <= startsAt.getTime()) {
          endsAt.setDate(endsAt.getDate() + 1);
        }

        sessions.push({
          slotId: slot._id!.toHexString(),
          date: new Date(dayStart),
          startsAt,
          endsAt,
          studentIds: (slot.studentsIds ?? []).map((id) => id.toString()),
        });
      }
      cur.setDate(cur.getDate() + 1);
    }

    return sessions;
  }

  async getSessionRoster(courseId: string, slotId: string, date: Date): Promise<{ studentIds: string[]; startsAt: Date; endsAt: Date } | null> {
    const course = await this.courseService.findOneById(courseId);
    if (!course) return null;

    const slots: TimeSlot[] = course.attendanceSettings?.offlineSchedule ?? [];
    const slot = slots.find((s) => s._id?.toString() === slotId && !s.deletedAt);
    if (!slot) return null;

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const startsAt = this.parseTimeOnDate(dayStart, slot.startTime);
    const endsAt = this.parseTimeOnDate(dayStart, slot.endTime);
    if (endsAt.getTime() <= startsAt.getTime()) endsAt.setDate(endsAt.getDate() + 1);

    return {
      studentIds: (slot.studentsIds ?? []).map((id) => id.toString()),
      startsAt,
      endsAt,
    };
  }

  private parseTimeOnDate(date: Date, time: string): Date {
    const trimmed = time.trim().toLowerCase();
    const parts = /^(\d{1,2}):(\d{2})\s*(am|pm)$/i.exec(trimmed);
    if (!parts) throw new Error(`Invalid time format: ${time}`);

    let hours = Number.parseInt(parts[1], 10);
    const minutes = Number.parseInt(parts[2], 10);
    const meridiem = parts[3].toLowerCase();

    if (meridiem === 'pm' && hours !== 12) hours += 12;
    if (meridiem === 'am' && hours === 12) hours = 0;

    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }
}
