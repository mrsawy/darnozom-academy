import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { PaginateModel } from 'mongoose';
import { NotificationType } from '@lms-organization/shared-types';
import { Notification } from './entities/notification.entity';

export interface CreateNotificationDto {
  userId: string;
  /** Translation key under the client's `Notifications` i18n namespace — never final text. */
  titleKey: string;
  /** Translation key under the client's `Notifications` i18n namespace, if the notification has a body. */
  bodyKey?: string;
  /** Interpolation values for `titleKey`/`bodyKey`. */
  params?: Record<string, string>;
  /** Extra payload the client uses to route a click (e.g. `{ courseId, contentId }`). Not translated. */
  data?: Record<string, string>;
  type?: NotificationType;
  relatedId?: string;
  relatedModel?: 'Course' | 'Enrollment' | 'CourseContent' | 'PrivateSession' | 'SessionBooking';
}

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: PaginateModel<Notification>
  ) {}

  private toDoc(dto: CreateNotificationDto) {
    return {
      userId: new mongoose.Types.ObjectId(dto.userId),
      titleKey: dto.titleKey,
      bodyKey: dto.bodyKey,
      params: dto.params,
      data: dto.data,
      type: dto.type ?? NotificationType.INFO,
      relatedId: dto.relatedId ? new mongoose.Types.ObjectId(dto.relatedId) : undefined,
      relatedModel: dto.relatedModel,
    };
  }

  async create(dto: CreateNotificationDto): Promise<Notification> {
    return this.notificationModel.create(this.toDoc(dto));
  }

  /** Bulk-inserts notifications (one per dto); returns the created documents. */
  async createMany(dtos: CreateNotificationDto[]): Promise<Notification[]> {
    if (dtos.length === 0) return [];
    const docs = await this.notificationModel.insertMany(dtos.map((dto) => this.toDoc(dto)));
    return docs as unknown as Notification[];
  }

  /** Of the given users, returns the ids that already have a notification of this type for the related document. */
  async findAlreadyNotifiedUserIds(userIds: string[], type: NotificationType, relatedId: string): Promise<Set<string>> {
    const rows = await this.notificationModel
      .find({
        userId: { $in: userIds.map((id) => new mongoose.Types.ObjectId(id)) },
        type,
        relatedId: new mongoose.Types.ObjectId(relatedId),
      })
      .select('userId')
      .lean();
    return new Set(rows.map((r) => r.userId.toString()));
  }

  async getForUser(
    userId: string,
    options: { page?: number; limit?: number; unreadOnly?: boolean }
  ): Promise<{ docs: Notification[]; totalDocs: number; unreadCount: number }> {
    const filter: mongoose.FilterQuery<Notification> = { userId: new mongoose.Types.ObjectId(userId) };
    if (options.unreadOnly) {
      filter.read = false;
    }
    const limit = Math.min(options.limit ?? 20, 50);
    const page = options.page ?? 1;
    const result = await this.notificationModel.paginate(filter, {
      page,
      limit,
      sort: { createdAt: -1 },
    });
    const unreadCount = await this.notificationModel.countDocuments({
      userId: new mongoose.Types.ObjectId(userId),
      read: false,
    });
    return {
      docs: result.docs,
      totalDocs: result.totalDocs,
      unreadCount,
    };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationModel.countDocuments({
      userId: new mongoose.Types.ObjectId(userId),
      read: false,
    });
  }

  async markAsRead(notificationId: string, userId: string): Promise<Notification> {
    const updated = await this.notificationModel.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(notificationId), userId: new mongoose.Types.ObjectId(userId) },
      { $set: { read: true, updatedAt: new Date() } },
      { new: true }
    );
    if (!updated) throw new NotFoundException('Notification not found');
    return updated;
  }

  async markAllAsRead(userId: string): Promise<{ modifiedCount: number }> {
    const result = await this.notificationModel.updateMany(
      { userId: new mongoose.Types.ObjectId(userId), read: false },
      { $set: { read: true, updatedAt: new Date() } }
    );
    return { modifiedCount: result.modifiedCount };
  }
}
