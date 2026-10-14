import {
  SESSION_SCORE_MAX,
  SESSION_SCORE_MIN,
  SUPERVISION_CRITERIA,
  SUPERVISION_EDIT_WINDOW_HOURS,
  SupervisionCriterion,
} from './academics.types';

describe('supervision shared types', () => {
  it('has exactly the concept’s five criteria, in the order the concept lists them', () => {
    expect([...SUPERVISION_CRITERIA]).toEqual([
      SupervisionCriterion.COMMITMENT,
      SupervisionCriterion.TEACHING,
      SupervisionCriterion.PEDAGOGY,
      SupervisionCriterion.CONTENT_ADHERENCE,
      SupervisionCriterion.TECHNICAL_QUALITY,
    ]);
  });

  it('scores on the same 1-to-5 scale the teacher report already uses', () => {
    expect(SESSION_SCORE_MIN).toBe(1);
    expect(SESSION_SCORE_MAX).toBe(5);
  });

  it('keeps an evaluation editable for seven days', () => {
    expect(SUPERVISION_EDIT_WINDOW_HOURS).toBe(7 * 24);
  });

  it('names no monetary criterion, because an evaluation can never affect pay', () => {
    const names = SUPERVISION_CRITERIA.join(',').toLowerCase();
    for (const forbidden of ['penalty', 'deduction', 'bonus', 'amount', 'pay']) {
      expect(names).not.toContain(forbidden);
    }
  });
});
