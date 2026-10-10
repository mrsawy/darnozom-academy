import { lookupNotDeleted, NOT_DELETED_FILTER } from '../../../src/utils/soft-delete';

describe('lookupNotDeleted', () => {
  it('joins by _id and excludes soft-deleted foreign docs', () => {
    expect(lookupNotDeleted('categories', 'categoriesIds', 'categories')).toEqual({
      $lookup: {
        from: 'categories',
        localField: 'categoriesIds',
        foreignField: '_id',
        pipeline: [{ $match: { ...NOT_DELETED_FILTER } }],
        as: 'categories',
      },
    });
  });

  it('appends extra pipeline stages after the not-deleted match', () => {
    const stage = lookupNotDeleted('categories', 'categoriesIds', 'categories', [{ $project: { _id: 1, name: 1 } }]);
    expect(stage.$lookup.pipeline).toEqual([{ $match: { deletedAt: null } }, { $project: { _id: 1, name: 1 } }]);
  });
});
