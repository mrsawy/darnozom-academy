import { Article } from 'src/course/entities/article.schema';
import { Assignment } from 'src/course/entities/assignment.schema';
import { Attachment } from 'src/course/entities/attachment.schema';
import { CourseContent } from 'src/course/entities/course-content.entity';
import { Quiz } from 'src/course/entities/quiz.schema';
import { Video } from 'src/course/entities/video.schema';

export type CourseContentDocument =
  | ((CourseContent & Quiz) & { fileUrl?: string })
  | ((CourseContent & Video) & { fileUrl?: string })
  | ((CourseContent & Article) & { fileUrl?: string })
  | ((CourseContent & Assignment) & { fileUrl?: string })
  | ((CourseContent & Attachment) & { fileUrl?: string });
