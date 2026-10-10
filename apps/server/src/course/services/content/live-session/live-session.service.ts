import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import mongoose, { Model, Connection } from 'mongoose';
import { CourseContent, CourseContentDocument } from '../../../entities/course-content.entity';
import { ContentType } from '../../../enum/contentType.enum';

import { MarkLiveSessionAttendanceDto } from '../../../../enrollment/dto/live-session-attendance.dto';
import { LiveSession } from '../../../entities/liveSession.schema';
import { LiveSessionAttendance } from '../../../entities/liveSessionAttendance.entity';

@Injectable()
export class LiveSessionService {
  constructor(
    @InjectModel(CourseContent.name)
    private readonly courseContentModel: Model<CourseContent>,
    @InjectConnection() private readonly connection: Connection
  ) {}

  async markAttendance(attendance: MarkLiveSessionAttendanceDto): Promise<{
    message: string;
    attendance: LiveSessionAttendance;
  }> {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const { liveSessionId: contentId, studentId, joinedAt, leftAt, wasPresent, notes } = attendance;

      // Fetch the live session content
      const content = (await this.courseContentModel.findById(contentId).session(session)) as CourseContentDocument | null;

      if (!content) {
        throw new NotFoundException('Live session not found');
      }

      if (content.type !== ContentType.LIVE_SESSION) {
        throw new BadRequestException('Content is not a live session');
      }

      const liveSession = content as unknown as CourseContent & LiveSession;

      // Check if session has started
      const now = new Date();
      if (liveSession.startDate && now < new Date(liveSession.startDate)) {
        throw new BadRequestException('Live session has not started yet');
      }

      // Check if student already marked attendance
      const existingAttendance = liveSession.attendance?.find((att: LiveSessionAttendance) => att.studentId.toString() === studentId);

      if (existingAttendance) {
        // Update existing attendance
        const attendanceIndex = liveSession.attendance?.findIndex((att: LiveSessionAttendance) => att.studentId.toString() === studentId);

        const updateData: Record<string, unknown> = {};
        if (joinedAt) {
          updateData[`attendance.${attendanceIndex}.joinedAt`] = new Date(joinedAt);
        }
        if (leftAt) {
          updateData[`attendance.${attendanceIndex}.leftAt`] = new Date(leftAt);
        }
        if (wasPresent !== undefined) {
          updateData[`attendance.${attendanceIndex}.wasPresent`] = wasPresent;
        }
        if (notes !== undefined) {
          updateData[`attendance.${attendanceIndex}.notes`] = notes;
        }

        // Calculate duration if both joinedAt and leftAt are provided
        if (joinedAt && leftAt) {
          const joined = new Date(joinedAt);
          const left = new Date(leftAt);
          const durationInMinutes = Math.round((left.getTime() - joined.getTime()) / (1000 * 60));
          updateData[`attendance.${attendanceIndex}.durationInMinutes`] = durationInMinutes;
        }

        const updatedContent = await this.courseContentModel.findByIdAndUpdate(contentId, { $set: updateData }, { session, new: true });

        await session.commitTransaction();

        return {
          message: 'Attendance updated successfully',
          attendance: updatedContent as unknown as LiveSessionAttendance,
        };
      }

      // Create new attendance record
      const attendanceRecord: Partial<LiveSessionAttendance> = {
        studentId: new mongoose.Types.ObjectId(studentId),
        joinedAt: joinedAt ? new Date(joinedAt) : now,
        leftAt: leftAt ? new Date(leftAt) : undefined,
        wasPresent: wasPresent ?? true,
        notes,
      };

      // Calculate duration if both joinedAt and leftAt are provided
      if (attendanceRecord.joinedAt && attendanceRecord.leftAt) {
        attendanceRecord.durationInMinutes = Math.round((attendanceRecord.leftAt.getTime() - attendanceRecord.joinedAt.getTime()) / (1000 * 60));
      }

      // Add attendance to live session
      const updatedContent = await this.courseContentModel.findOneAndUpdate(
        {
          _id: contentId,
          type: ContentType.LIVE_SESSION,
          attendance: {
            $not: {
              $elemMatch: {
                studentId: attendanceRecord.studentId,
              },
            },
          },
        },
        {
          $push: { attendance: attendanceRecord },
        },
        { session, new: true }
      );

      if (!updatedContent) {
        throw new NotFoundException('Content not found or duplicate attendance');
      }

      await session.commitTransaction();

      return {
        message: 'Attendance marked successfully',
        attendance: attendanceRecord as unknown as LiveSessionAttendance,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      void session.endSession();
    }
  }

  async getLiveSessionAttendance(
    liveSessionId: string,
    studentId?: string
  ): Promise<{
    attendance: LiveSessionAttendance | LiveSessionAttendance[] | null;
    session: {
      startDate: Date;
      endDate: Date;
      meetingUrl?: string;
      meetingId?: string;
      platform?: string;
      recordingUrl?: string;
      durationInMinutes?: number;
      description?: string;
    };
  }> {
    const content = await this.courseContentModel.findById(liveSessionId);

    if (!content) {
      throw new NotFoundException('Live session not found');
    }

    if ((content as unknown as CourseContentDocument).type !== ContentType.LIVE_SESSION) {
      throw new BadRequestException('Content is not a live session');
    }

    const liveSession = content as unknown as CourseContent & LiveSession;

    if (studentId) {
      // Return only the student's attendance
      const studentAttendance = liveSession.attendance?.find((att: LiveSessionAttendance) => att.studentId.toString() === studentId);

      return {
        attendance: studentAttendance ?? null,
        session: {
          startDate: liveSession.startDate,
          endDate: liveSession.endDate,
          meetingUrl: liveSession.meetingUrl,
          meetingId: liveSession.meetingId,
          platform: liveSession.platform,
          recordingUrl: liveSession.recordingUrl,
          durationInMinutes: liveSession.durationInMinutes,
          description: liveSession.description,
        },
      };
    }

    // Return all attendance (for instructors/admins)
    return {
      attendance: liveSession.attendance ?? [],
      session: {
        startDate: liveSession.startDate,
        endDate: liveSession.endDate,
        meetingUrl: liveSession.meetingUrl,
        meetingId: liveSession.meetingId,
        platform: liveSession.platform,
        recordingUrl: liveSession.recordingUrl,
        durationInMinutes: liveSession.durationInMinutes,
        description: liveSession.description,
      },
    };
  }
}
