import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SHARIA_SUPERSEDED_COMMENT, ShariaStatus } from '@darnozom/shared-types';
import { ContentVersion } from '../../../entities/content-version.entity';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));

export interface ContentVersionLean {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  contentId: Types.ObjectId;
  courseId: Types.ObjectId;
  version: number;
  changes: Record<string, unknown>;
  createdBy: Types.ObjectId | null;
  shariaStatus: ShariaStatus;
  reviewedBy: Types.ObjectId | null;
  reviewedAt: Date | null;
  reviewComment: string | null;
  createdAt?: Date;
}

export interface RecordVersionInput {
  organizationId: Types.ObjectId | string;
  contentId: Types.ObjectId | string;
  courseId: Types.ObjectId | string;
  changes: Record<string, unknown>;
  createdBy?: Types.ObjectId | string | null;
}

@Injectable()
export class ContentVersionService {
  constructor(@InjectModel(ContentVersion.name) private readonly versionModel: Model<ContentVersion>) {}

  /** Appends a pending version, numbered one above the highest this content has ever had. */
  async record(input: RecordVersionInput): Promise<ContentVersionLean> {
    const highest = await this.versionModel
      .findOne({ contentId: oid(input.contentId) })
      .sort({ version: -1 })
      .lean<{ version: number } | null>()
      .exec();

    // One above the highest, never the count: superseded versions stay in place and still own a number.
    const version = (highest?.version ?? 0) + 1;
    const created = await this.versionModel.create({
      organizationId: oid(input.organizationId),
      contentId: oid(input.contentId),
      courseId: oid(input.courseId),
      version,
      changes: input.changes,
      createdBy: input.createdBy ? oid(input.createdBy) : null,
      shariaStatus: ShariaStatus.PENDING,
    });
    return created as unknown as ContentVersionLean;
  }

  /** Newest first — the history drawer reads most-recent-first. */
  async listForContent(organizationId: string, contentId: string): Promise<ContentVersionLean[]> {
    return this.versionModel
      .find({ organizationId: oid(organizationId), contentId: oid(contentId) })
      .sort({ version: -1 })
      .lean<ContentVersionLean[]>()
      .exec();
  }

  async findVersion(organizationId: string, contentId: string, version: number): Promise<ContentVersionLean | null> {
    return this.versionModel
      .findOne({ organizationId: oid(organizationId), contentId: oid(contentId), version })
      .lean<ContentVersionLean | null>()
      .exec();
  }

  /** A newer edit replaced the ones still waiting. They are closed as rejected, with a reason. */
  async supersedePending(contentId: Types.ObjectId | string, exceptVersion: number): Promise<number> {
    const result = await this.versionModel
      .updateMany(
        { contentId: oid(contentId), shariaStatus: ShariaStatus.PENDING, version: { $ne: exceptVersion } },
        {
          $set: {
            shariaStatus: ShariaStatus.REJECTED,
            reviewComment: SHARIA_SUPERSEDED_COMMENT,
            reviewedAt: new Date(),
            reviewedBy: null,
          },
        },
      )
      .exec();
    return result.modifiedCount;
  }

  /**
   * Records the review outcome. The `PENDING` guard is what makes approve and reject
   * single-shot: a second call, or a race between two reviewers, modifies nothing.
   */
  async markReviewed(
    versionId: Types.ObjectId | string,
    status: ShariaStatus,
    reviewerId: Types.ObjectId | string,
    comment: string | null,
  ): Promise<boolean> {
    const result = await this.versionModel
      .updateOne(
        { _id: oid(versionId), shariaStatus: ShariaStatus.PENDING },
        { $set: { shariaStatus: status, reviewedBy: oid(reviewerId), reviewedAt: new Date(), reviewComment: comment } },
      )
      .exec();
    return result.modifiedCount === 1;
  }
}
