import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ShariaStatus } from '@darnozom/shared-types';
import { CourseContent } from '../../../entities/course-content.entity';
import { ContentVersionService } from './content-version.service';
import { decideShariaPath } from './sharia-decision';

interface GatedContent {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  courseId: Types.ObjectId;
  shariaStatus: ShariaStatus;
}

@Injectable()
export class ShariaGateService {
  constructor(
    @InjectModel(CourseContent.name) private readonly contentModel: Model<CourseContent>,
    private readonly versions: ContentVersionService
  ) {}

  /** Called right after a content item is created: version 1 is the full creation payload. */
  async onCreated(content: GatedContent, payload: Record<string, unknown>, authorId?: Types.ObjectId | string | null): Promise<void> {
    const version = await this.versions.record({
      organizationId: content.organizationId,
      contentId: content._id,
      courseId: content.courseId,
      changes: payload,
      createdBy: authorId ?? null,
    });
    await this.contentModel
      .updateOne({ _id: content._id }, { $set: { shariaStatus: ShariaStatus.PENDING, currentVersion: version.version, pendingVersion: null } })
      .exec();
  }

  /**
   * Called before an edit is written.
   *
   * Returns true when the caller should go on and apply it, false when the edit was captured as a
   * pending version instead and the live content must not change. Returning false is what keeps
   * students on the approved values while a reviewer looks at the new ones.
   */
  async beforeUpdate(content: GatedContent, changes: Record<string, unknown>, authorId?: Types.ObjectId | string | null): Promise<boolean> {
    const path = decideShariaPath(content.shariaStatus, changes);
    if (path === 'APPLY_UNGATED') return true;

    const version = await this.versions.record({
      organizationId: content.organizationId,
      contentId: content._id,
      courseId: content.courseId,
      changes,
      createdBy: authorId ?? null,
    });

    if (path === 'APPLY_AND_PEND') {
      // Nothing of this item was ever approved, so there is nothing to protect: write the edit now
      // and leave the whole item in the queue.
      await this.contentModel
        .updateOne({ _id: content._id }, { $set: { shariaStatus: ShariaStatus.PENDING, currentVersion: version.version, pendingVersion: null } })
        .exec();
      return true;
    }

    // HOLD_AS_PENDING: only one edit may wait at a time, so an older one is closed as superseded.
    await this.versions.supersedePending(content._id, version.version);
    await this.contentModel.updateOne({ _id: content._id }, { $set: { pendingVersion: version.version } }).exec();
    return false;
  }
}
