import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ShariaStatus } from '@darnozom/shared-types';
import { FileService } from 'src/file/file.service';
import { ContentVersion } from '../../../entities/content-version.entity';
import { CourseContent } from '../../../entities/course-content.entity';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));

@Injectable()
export class ShariaFileCleanupService {
  private readonly logger = new Logger(ShariaFileCleanupService.name);

  constructor(
    @InjectModel(ContentVersion.name) private readonly versionModel: Model<ContentVersion>,
    @InjectModel(CourseContent.name) private readonly contentModel: Model<CourseContent>,
    private readonly files: FileService
  ) {}

  /**
   * A superseded or rejected version's upload is deleted only when nothing still needs it: no
   * approved version references the key, and the live content is not serving it. Two pending edits
   * can name the same key, so counting references is the only safe test.
   */
  async onVersionClosed(contentId: Types.ObjectId | string, changes: Record<string, unknown>): Promise<void> {
    const fileKey = changes?.fileKey;
    if (typeof fileKey !== 'string' || fileKey.length === 0) return;

    const approved = await this.versionModel
      .countDocuments({ contentId: oid(contentId), shariaStatus: ShariaStatus.APPROVED, 'changes.fileKey': fileKey })
      .exec();
    if (approved > 0) return;

    const content = await this.contentModel
      .findOne({ _id: oid(contentId) })
      .lean<{ _id: Types.ObjectId; fileKey?: string | null } | null>()
      .exec();
    if (content?.fileKey === fileKey) return;

    try {
      await this.files.deleteFile(fileKey);
    } catch (error) {
      // An orphaned object costs storage; a failed review costs the reviewer their work.
      this.logger.error(`Could not delete the orphaned upload ${fileKey}: ${(error as Error).message}`);
    }
  }
}
