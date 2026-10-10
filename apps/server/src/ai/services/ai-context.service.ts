import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CourseContent } from 'src/course/entities/course-content.entity';
import { Course } from 'src/course/entities/course.entity';
import { ContentType } from 'src/course/enum/contentType.enum';
import { TranscriptStatus } from 'src/course/enum/transcriptStatus.enum';

const MAX_TRANSCRIPT_CHARS = 8000;

interface TranscribableContentDoc {
  type: ContentType;
  title?: string;
  transcriptStatus?: TranscriptStatus;
  transcript?: string;
  transcriptData?: {
    summary?: string;
    keyPoints?: string[];
    topics?: string[];
  };
}

interface CourseDoc {
  name?: string;
  description?: string;
}

interface ModuleDoc {
  title?: string;
  description?: string;
}

@Injectable()
export class AiContextService {
  private readonly logger = new Logger(AiContextService.name);

  constructor(
    @InjectModel(CourseContent.name) private readonly courseContentModel: Model<CourseContent>,
    @InjectModel(Course.name) private readonly courseModel: Model<Course>,
    @InjectModel('CourseModule') private readonly courseModuleModel: Model<ModuleDoc>
  ) {}

  async buildSystemContext(contentId: string): Promise<string | null> {
    let doc: TranscribableContentDoc | null;
    try {
      doc = (await this.courseContentModel
        .findById(contentId)
        .select('type title transcriptStatus transcript transcriptData')
        .lean()) as TranscribableContentDoc | null;
    } catch (err) {
      this.logger.warn(`Failed to load content ${contentId} for AI context: ${(err as Error).message}`);
      return null;
    }

    if (!doc) return null;
    if (doc.type !== ContentType.VIDEO && doc.type !== ContentType.ATTACHMENT) return null;
    if (doc.transcriptStatus !== TranscriptStatus.READY || !doc.transcript) return null;

    const { transcriptData, transcript, title } = doc;
    const parts: string[] = [];

    const contextLabel = doc.type === ContentType.ATTACHMENT ? 'سياق المرفق' : 'سياق الدرس';
    const itemLabel = doc.type === ContentType.ATTACHMENT ? 'المرفق' : 'الدرس';
    parts.push(`=== ${contextLabel} ===`);
    if (title) parts.push(`${itemLabel}: ${title}`);
    if (transcriptData?.summary) parts.push(`\nملخص:\n${transcriptData.summary}`);
    if (transcriptData?.keyPoints?.length) {
      parts.push(`\nالنقاط الرئيسية:\n${transcriptData.keyPoints.map((p) => `• ${p}`).join('\n')}`);
    }
    if (transcriptData?.topics?.length) {
      parts.push(`\nالموضوعات: ${transcriptData.topics.join('، ')}`);
    }

    const truncated = transcript.length > MAX_TRANSCRIPT_CHARS ? transcript.slice(0, MAX_TRANSCRIPT_CHARS) + '…' : transcript;
    parts.push(`\nمحتوى ${itemLabel}:\n${truncated}`, `=== نهاية ${contextLabel} ===`);

    return parts.join('\n');
  }

  async buildGenerationContext(courseId?: string, moduleId?: string, contentId?: string): Promise<string | null> {
    const parts: string[] = [];

    if (courseId) {
      try {
        const course = (await this.courseModel.findById(courseId).select('name description').lean()) as CourseDoc | null;
        if (course) {
          parts.push('=== سياق الدورة ===');
          if (course.name) parts.push(`الدورة: ${course.name}`);
          if (course.description) parts.push(`وصف الدورة: ${course.description}`);
          parts.push('=== نهاية سياق الدورة ===');
        }
      } catch (err) {
        this.logger.warn(`Failed to load course ${courseId} for generation context: ${(err as Error).message}`);
      }
    }

    if (moduleId) {
      try {
        const mod = (await this.courseModuleModel.findById(moduleId).select('title description').lean()) as ModuleDoc | null;
        if (mod) {
          parts.push('=== سياق الوحدة ===');
          if (mod.title) parts.push(`الوحدة: ${mod.title}`);
          if (mod.description) parts.push(`وصف الوحدة: ${mod.description}`);
          parts.push('=== نهاية سياق الوحدة ===');
        }
      } catch (err) {
        this.logger.warn(`Failed to load module ${moduleId} for generation context: ${(err as Error).message}`);
      }
    }

    if (contentId) {
      const contentContext = await this.buildSystemContext(contentId).catch(() => null);
      if (contentContext) parts.push(contentContext);
    }

    return parts.length > 0 ? parts.join('\n\n') : null;
  }
}
