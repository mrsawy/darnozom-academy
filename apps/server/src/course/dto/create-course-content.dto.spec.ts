import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateCourseContentDto } from './create-course-content.dto';
import { ContentType } from '../enum/contentType.enum';
import { VideoType } from '../enum/videoType.enum';

const COURSE = '507f1f77bcf86cd799439011';
const MODULE = '507f1f77bcf86cd799439012';

async function invalidProps(payload: Record<string, unknown>): Promise<string[]> {
  const dto = plainToInstance(CreateCourseContentDto, payload);
  const errors = await validate(dto);
  return errors.map((e) => e.property);
}

describe('CreateCourseContentDto validation', () => {
  const base = { courseId: COURSE, moduleId: MODULE, title: 'T' };

  describe('fileSizeBytes is required for every uploaded-file type (P3.1)', () => {
    it('requires fileSizeBytes for a VIDEO UPLOAD', async () => {
      expect(await invalidProps({ ...base, type: ContentType.VIDEO, videoType: VideoType.UPLOAD, fileKey: 'k' })).toContain('fileSizeBytes');
    });

    it('requires fileSizeBytes for an ASSIGNMENT that has a fileKey', async () => {
      expect(await invalidProps({ ...base, type: ContentType.ASSIGNMENT, dueDate: '2030-01-01T00:00:00.000Z', fileKey: 'k' })).toContain(
        'fileSizeBytes'
      );
    });

    it('accepts a VIDEO UPLOAD when fileSizeBytes is present', async () => {
      expect(await invalidProps({ ...base, type: ContentType.VIDEO, videoType: VideoType.UPLOAD, fileKey: 'k', fileSizeBytes: 1000 })).not.toContain(
        'fileSizeBytes'
      );
    });

    it('caps ATTACHMENT size at 30MB but leaves large videos uncapped', async () => {
      const tooBig = 31_457_280 + 1;
      expect(
        await invalidProps({ ...base, type: ContentType.ATTACHMENT, fileKey: 'k', mimeType: 'application/pdf', fileSizeBytes: tooBig })
      ).toContain('fileSizeBytes');
      expect(
        await invalidProps({ ...base, type: ContentType.VIDEO, videoType: VideoType.UPLOAD, fileKey: 'k', fileSizeBytes: tooBig })
      ).not.toContain('fileSizeBytes');
    });
  });

  describe('quiz question integrity + maxAttempts (P3.2 / P2.1)', () => {
    const quizBase = {
      ...base,
      type: ContentType.QUIZ,
      quizStartDate: '2030-01-01T00:00:00.000Z',
      quizEndDate: '2030-01-02T00:00:00.000Z',
      quizDurationInMinutes: 10,
    };

    it('rejects a correctOption index outside the options array', async () => {
      expect(await invalidProps({ ...quizBase, questions: [{ questionText: 'q', options: ['a', 'b'], correctOption: 5 }] })).toContain('questions');
    });

    it('rejects non-string options', async () => {
      expect(await invalidProps({ ...quizBase, questions: [{ questionText: 'q', options: [1, 2], correctOption: 0 }] })).toContain('questions');
    });

    it('accepts a well-formed quiz including maxAttempts', async () => {
      const props = await invalidProps({ ...quizBase, maxAttempts: 3, questions: [{ questionText: 'q', options: ['a', 'b'], correctOption: 1 }] });
      expect(props).not.toContain('questions');
      expect(props).not.toContain('maxAttempts');
    });

    it('rejects maxAttempts below 1', async () => {
      expect(await invalidProps({ ...quizBase, maxAttempts: 0, questions: [{ questionText: 'q', options: ['a'], correctOption: 0 }] })).toContain(
        'maxAttempts'
      );
    });
  });
});
