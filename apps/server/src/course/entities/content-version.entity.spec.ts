import { ShariaStatus } from '@darnozom/shared-types';
import { ContentVersionSchema } from './content-version.entity';

describe('ContentVersionSchema', () => {
  it('numbers versions uniquely per content item', () => {
    const entry = ContentVersionSchema.indexes().find(([, options]) => options?.name === 'content_version_unique');
    expect(entry).toBeDefined();
    const [fields, options] = entry!;
    expect(fields).toEqual({ contentId: 1, version: 1 });
    expect(options?.unique).toBe(true);
  });

  it('indexes the reviewer queue by organization and status', () => {
    const names = ContentVersionSchema.indexes().map(([, options]) => options?.name);
    expect(names).toContain('sharia_queue');
  });

  it('starts a version as pending review', () => {
    const path = ContentVersionSchema.path('shariaStatus') as any;
    expect(path.options.default).toBe(ShariaStatus.PENDING);
  });

  it('stores the change-set as a free-form object, since content types differ', () => {
    expect(ContentVersionSchema.path('changes')).toBeDefined();
  });

  it('has no soft-delete fields, because a version is never deleted', () => {
    expect(ContentVersionSchema.path('deletedAt')).toBeUndefined();
  });
});
