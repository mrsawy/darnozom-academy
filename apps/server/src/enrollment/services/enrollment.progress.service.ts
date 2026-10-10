import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { PaginateModel } from 'mongoose';
import { Enrollment, ContentProgressItem } from '../entities/enrollment.entity';

@Injectable()
export class EnrollmentProgressService {
  constructor(
    @InjectModel(Enrollment.name)
    private readonly enrollmentModel: PaginateModel<Enrollment>
  ) {}

  /**
   * Record that the user opened/accessed a content item. Updates lastAccessedAt on enrollment
   * and upserts an entry in progress.contentTimeTracking (firstAccessedAt, lastAccessedAt, accessCount, optional video position).
   */
  async recordContentAccess(
    enrollmentId: string,
    userId: string,
    contentId: string,
    options?: { videoPositionSeconds?: number; contentTitle?: string; contentType?: string }
  ): Promise<{ progress: ContentProgressItem; enrollment: Enrollment }> {
    const enrollment = await this.enrollmentModel.findOne({
      _id: new mongoose.Types.ObjectId(enrollmentId),
      userId: new mongoose.Types.ObjectId(userId),
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');

    this.ensureProgressContentTimeTracking(enrollment);

    const contentOid = new mongoose.Types.ObjectId(contentId);
    const tracking = enrollment.progress.contentTimeTracking;
    const existing = tracking.find((t) => t.contentId && t.contentId.toString() === contentId);

    const now = new Date();
    if (existing) {
      existing.lastAccessedAt = now;
      existing.accessCount = (existing.accessCount || 0) + 1;
      if (options?.videoPositionSeconds !== undefined) existing.videoLastPositionSeconds = options.videoPositionSeconds;
      if (options?.contentTitle !== undefined) existing.contentTitle = options.contentTitle;
      if (options?.contentType !== undefined) existing.contentType = options.contentType;
    } else {
      tracking.push({
        contentId: contentOid,
        contentTitle: options?.contentTitle ?? '',
        contentType: options?.contentType ?? '',
        timeSpentMinutes: 0,
        firstAccessedAt: now,
        lastAccessedAt: now,
        completedAt: null,
        videoLastPositionSeconds: options?.videoPositionSeconds ?? 0,
        accessCount: 1,
      } as ContentProgressItem);
    }

    enrollment.lastAccessedAt = now;
    await enrollment.save();

    const item = enrollment.progress.contentTimeTracking.find((t) => t.contentId && t.contentId.toString() === contentId);
    return { progress: item!, enrollment };
  }

  /**
   * Add time spent on a content item. Updates both the per-content entry and enrollment.timeSpentMinutes.
   */
  async recordTimeSpent(enrollmentId: string, userId: string, contentId: string, additionalMinutes: number): Promise<Enrollment> {
    if (additionalMinutes <= 0) {
      const enrollment = await this.enrollmentModel.findOne({
        _id: new mongoose.Types.ObjectId(enrollmentId),
        userId: new mongoose.Types.ObjectId(userId),
      });
      if (!enrollment) throw new NotFoundException('Enrollment not found');
      return enrollment;
    }

    const enrollment = await this.enrollmentModel.findOne({
      _id: new mongoose.Types.ObjectId(enrollmentId),
      userId: new mongoose.Types.ObjectId(userId),
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');

    this.ensureProgressContentTimeTracking(enrollment);

    const tracking = enrollment.progress.contentTimeTracking;
    const existing = tracking.find((t) => t.contentId && t.contentId.toString() === contentId);
    if (existing) {
      existing.timeSpentMinutes = (existing.timeSpentMinutes || 0) + additionalMinutes;
      existing.lastAccessedAt = new Date();
    } else {
      const now = new Date();
      tracking.push({
        contentId: new mongoose.Types.ObjectId(contentId),
        contentTitle: '',
        contentType: '',
        timeSpentMinutes: additionalMinutes,
        firstAccessedAt: now,
        lastAccessedAt: now,
        completedAt: null,
        videoLastPositionSeconds: 0,
        accessCount: 1,
      } as ContentProgressItem);
    }

    enrollment.timeSpentMinutes = (enrollment.timeSpentMinutes || 0) + additionalMinutes;
    await enrollment.save();
    return enrollment;
  }

  /**
   * Update video resume position for a content item (e.g. on pause or page leave).
   */
  async updateVideoProgress(
    enrollmentId: string,
    userId: string,
    contentId: string,
    positionSeconds: number
  ): Promise<{ videoLastPositionSeconds: number }> {
    const enrollment = await this.enrollmentModel.findOne({
      _id: new mongoose.Types.ObjectId(enrollmentId),
      userId: new mongoose.Types.ObjectId(userId),
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');

    this.ensureProgressContentTimeTracking(enrollment);

    const tracking = enrollment.progress.contentTimeTracking;
    const existing = tracking.find((t) => t.contentId && t.contentId.toString() === contentId);
    const value = Math.max(0, positionSeconds);
    if (existing) {
      existing.videoLastPositionSeconds = value;
      existing.lastAccessedAt = new Date();
    } else {
      const now = new Date();
      tracking.push({
        contentId: new mongoose.Types.ObjectId(contentId),
        contentTitle: '',
        contentType: '',
        timeSpentMinutes: 0,
        firstAccessedAt: now,
        lastAccessedAt: now,
        completedAt: null,
        videoLastPositionSeconds: value,
        accessCount: 1,
      } as ContentProgressItem);
    }
    await enrollment.save();
    return { videoLastPositionSeconds: value };
  }

  /**
   * Get progress for a single content (e.g. time spent and video resume position).
   */
  async getContentProgress(enrollmentId: string, userId: string, contentId: string): Promise<ContentProgressItem | null> {
    const enrollment = await this.enrollmentModel.findOne({
      _id: new mongoose.Types.ObjectId(enrollmentId),
      userId: new mongoose.Types.ObjectId(userId),
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');

    const tracking = enrollment.progress?.contentTimeTracking || [];
    return tracking.find((t) => t.contentId && t.contentId.toString() === contentId) ?? null;
  }

  private ensureProgressContentTimeTracking(enrollment: Enrollment): void {
    if (!enrollment.progress) {
      enrollment.progress = {
        completedModules: [],
        completedContents: [],
        completedCourses: [],
        submittedAssignments: [],
        submittedProjects: [],
        submittedQuizzes: [],
        attendedLiveSessions: [],
        assignmentSubmissions: [],
        quizSubmissions: [],
        contentTimeTracking: [],
      } as Enrollment['progress'];
    }
    if (!Array.isArray(enrollment.progress.contentTimeTracking)) {
      enrollment.progress.contentTimeTracking = [];
    }
  }
}
