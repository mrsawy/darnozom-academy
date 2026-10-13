import { Injectable } from '@nestjs/common';
import { NotificationTextKey, NotificationType } from '@darnozom/shared-types';
import { NotificationService } from 'src/notification/notification.service';
import { TaskLean } from './task.types';

@Injectable()
export class TaskNotificationService {
  constructor(private readonly notifications: NotificationService) {}

  /** In-app only. The concept's multi-channel engine is a later phase (spec §5.4). */
  async taskAssigned(task: TaskLean, groupName: string, userIds: string[]): Promise<void> {
    await this.send(task, groupName, userIds, NotificationTextKey.TASK_ASSIGNED_TITLE, NotificationTextKey.TASK_ASSIGNED_BODY);
  }

  async taskEscalated(task: TaskLean, groupName: string, userIds: string[]): Promise<void> {
    await this.send(task, groupName, userIds, NotificationTextKey.TASK_ESCALATED_TITLE, NotificationTextKey.TASK_ESCALATED_BODY);
  }

  private async send(task: TaskLean, groupName: string, userIds: string[], titleKey: string, bodyKey: string): Promise<void> {
    if (userIds.length === 0) return;
    await this.notifications.createMany(
      userIds.map((userId) => ({
        userId,
        titleKey,
        bodyKey,
        params: { groupName, item: task.readinessKey, days: String(task.milestoneDays) },
        data: { groupId: String(task.groupId), taskId: String(task._id) },
        type: NotificationType.INFO,
        relatedId: String(task.groupId),
        relatedModel: 'Group' as const,
      }))
    );
  }
}
