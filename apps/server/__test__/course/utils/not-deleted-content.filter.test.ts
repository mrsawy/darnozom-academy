import {
  NOT_DELETED_CONTENT_FILTER,
  withNotDeletedContentFilter,
} from '../../../src/course/utils/not-deleted-content.filter';

describe('NOT_DELETED_CONTENT_FILTER', () => {
  it('excludes soft-deleted contents by deletedAt (User pattern)', () => {
    expect(NOT_DELETED_CONTENT_FILTER).toEqual({
      deletedAt: null,
    });
  });

  it('merges the not-deleted constraint into an existing filter', () => {
    const organizationId = 'org-1';
    expect(withNotDeletedContentFilter({ organizationId, type: 'VIDEO' })).toEqual({
      organizationId,
      type: 'VIDEO',
      deletedAt: null,
    });
  });
});
