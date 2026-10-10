import { ContentType } from '../enum/contentType.enum';
import { sanitizeContentForStudent, sanitizeContentsForStudent } from './content-sanitizer.util';

describe('sanitizeContentForStudent', () => {
  it('strips the answer key and submissions from a quiz', () => {
    const quiz = {
      type: ContentType.QUIZ,
      title: 'Quiz 1',
      questions: [
        { questionText: 'Q1', options: ['a', 'b'], correctOption: 1 },
        { questionText: 'Q2', options: ['c', 'd'], correctOption: 0 },
      ],
      quizSubmissions: [{ studentId: 's1', score: 5 }],
    };

    const result = sanitizeContentForStudent(quiz);

    expect(result).toBe(quiz); // mutates in place
    expect(quiz.quizSubmissions).toBeUndefined();
    for (const question of quiz.questions) {
      expect(question).not.toHaveProperty('correctOption');
      expect(question.questionText).toBeDefined(); // other fields survive
      expect(question.options).toBeDefined();
    }
  });

  it('strips submissions from a project', () => {
    const project = { type: ContentType.PROJECT, requirements: 'do it', submissions: [{ studentId: 's1' }] };
    sanitizeContentForStudent(project);
    expect(project).not.toHaveProperty('submissions');
    expect(project.requirements).toBe('do it');
  });

  it('strips attendance from a live session', () => {
    const live = { type: ContentType.LIVE_SESSION, meetingUrl: 'https://x', attendance: [{ studentId: 's1' }] };
    sanitizeContentForStudent(live);
    expect(live).not.toHaveProperty('attendance');
    expect(live.meetingUrl).toBe('https://x');
  });

  it('leaves assignment content (incl. its own filtered submissions) untouched', () => {
    const assignment = { type: ContentType.ASSIGNMENT, submissions: [{ studentId: 'me', fileUrl: 'signed' }] };
    sanitizeContentForStudent(assignment);
    expect(assignment.submissions).toHaveLength(1);
  });

  it('leaves article and video content untouched', () => {
    const article = { type: ContentType.ARTICLE, body: 'hello' };
    const video = { type: ContentType.VIDEO, videoUrl: 'https://y' };
    expect(sanitizeContentForStudent(article)).toEqual({ type: ContentType.ARTICLE, body: 'hello' });
    expect(sanitizeContentForStudent(video)).toEqual({ type: ContentType.VIDEO, videoUrl: 'https://y' });
  });

  it('tolerates null / undefined / malformed input', () => {
    expect(sanitizeContentForStudent(null)).toBeNull();
    expect(sanitizeContentForStudent()).toBeUndefined();
    expect(sanitizeContentForStudent({ type: ContentType.QUIZ })).toEqual({ type: ContentType.QUIZ });
  });
});

describe('sanitizeContentsForStudent', () => {
  it('sanitizes every content in a list and ignores nulls', () => {
    const contents = [
      { type: ContentType.QUIZ, questions: [{ questionText: 'Q', options: ['a'], correctOption: 0 }], quizSubmissions: [] },
      null,
      { type: ContentType.ARTICLE, body: 'x' },
    ];
    sanitizeContentsForStudent(contents);
    expect(contents[0]).not.toHaveProperty('quizSubmissions');
    expect((contents[0] as { questions: object[] }).questions[0]).not.toHaveProperty('correctOption');
  });

  it('tolerates non-array input', () => {
    expect(() => sanitizeContentsForStudent(null)).not.toThrow();
    expect(() => sanitizeContentsForStudent()).not.toThrow();
  });
});
