import { describe, expect, it } from 'vitest';
import { academicsKeys } from './use-academics.hook';

describe('academicsKeys supervision entries', () => {
  it('namespaces evaluation queries under academics, so one write refreshes them all', () => {
    expect(academicsKeys.evaluations({})[0]).toBe('academics');
    expect(academicsKeys.sessionEvaluations('s1')[0]).toBe('academics');
  });

  it('keys the list by its query and the session list by session', () => {
    expect(academicsKeys.evaluations({ groupId: 'g1' })).not.toEqual(academicsKeys.evaluations({}));
    expect(academicsKeys.sessionEvaluations('s1')).not.toEqual(
      academicsKeys.sessionEvaluations('s2')
    );
  });
});
