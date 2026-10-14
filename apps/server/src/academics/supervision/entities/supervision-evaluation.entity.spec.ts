import { SESSION_SCORE_MAX, SESSION_SCORE_MIN, SUPERVISION_CRITERIA } from '@darnozom/shared-types';
import { SupervisionEvaluationSchema } from './supervision-evaluation.entity';

const path = (name: string) => SupervisionEvaluationSchema.path(name) as { options: Record<string, unknown> } | undefined;

describe('SupervisionEvaluationSchema', () => {
  it('lets a supervisor evaluate a session exactly once', () => {
    const entry = SupervisionEvaluationSchema.indexes().find(([, options]) => options?.name === 'one_evaluation_per_supervisor_session');
    expect(entry).toBeDefined();
    const [fields, options] = entry!;
    expect(fields).toEqual({ sessionId: 1, supervisorId: 1 });
    expect(options?.unique).toBe(true);
  });

  it('requires all five criteria, each bounded to the shared 1-to-5 scale', () => {
    for (const criterion of SUPERVISION_CRITERIA) {
      const options = path(criterion)?.options;
      expect(options).toBeDefined();
      expect(options?.required).toBe(true);
      expect(options?.min).toBe(SESSION_SCORE_MIN);
      expect(options?.max).toBe(SESSION_SCORE_MAX);
    }
  });

  it('keeps the teacher and the group on the record, so evaluations can be listed by either', () => {
    expect(path('teacherId')?.options.required).toBe(true);
    expect(path('groupId')?.options.required).toBe(true);
  });

  it('has no monetary field: an evaluation can never reach pay', () => {
    const fields = Object.keys(SupervisionEvaluationSchema.paths).join(',').toLowerCase();
    for (const forbidden of ['penalty', 'deduction', 'bonus', 'amount', 'salary', 'pay']) {
      expect(fields).not.toContain(forbidden);
    }
  });

  it('indexes the two listing paths', () => {
    const names = SupervisionEvaluationSchema.indexes().map(([, options]) => options?.name);
    expect(names).toEqual(expect.arrayContaining(['evaluations_by_group', 'evaluations_by_teacher']));
  });
});
