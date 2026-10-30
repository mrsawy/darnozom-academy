import { PaymentMethodFieldType } from '@darnozom/shared-types';
import { PaymentMethodConfigSchema } from './payment-method-config.entity';

describe('PaymentMethodConfigSchema', () => {
  it('is unique per organization and key', () => {
    const entry = PaymentMethodConfigSchema.indexes().find(([, o]) => o?.name === 'payment_method_config_unique_key');
    expect(entry).toBeDefined();
    const [fields, options] = entry!;
    expect(fields).toEqual({ organizationId: 1, key: 1 });
    expect(options?.unique).toBe(true);
  });

  it('accepts the three field types', () => {
    const fields = PaymentMethodConfigSchema.path('fields') as unknown as {
      schema: { path: (p: string) => { options: { enum: string[] } } };
    };
    expect(fields.schema.path('type').options.enum).toEqual(Object.values(PaymentMethodFieldType));
  });

  it('defaults enabled to false until the admin turns it on', () => {
    expect((PaymentMethodConfigSchema.path('enabled') as unknown as { options: { default: boolean } }).options.default).toBe(false);
  });

  it('accepts BUILT_IN and CUSTOM kinds', () => {
    const kind = PaymentMethodConfigSchema.path('kind') as unknown as { options: { enum: string[] } };
    expect(kind.options.enum).toEqual(['BUILT_IN', 'CUSTOM']);
  });
});
