import { MessageTemplateSchema } from './message-template.entity';

describe('MessageTemplate schema', () => {
  it('has expected fields defined', () => {
    const paths = MessageTemplateSchema.paths;
    expect(paths).toHaveProperty('organizationId');
    expect(paths).toHaveProperty('name');
    expect(paths).toHaveProperty('context');
    expect(paths).toHaveProperty('body');
    expect(paths).toHaveProperty('createdBy');
    expect(paths).toHaveProperty('deletedAt');
  });

  it('body has maxlength 2000', () => {
    const bodyPath = MessageTemplateSchema.path('body') as any;
    expect(bodyPath.options.maxlength).toBe(2000);
  });
});
