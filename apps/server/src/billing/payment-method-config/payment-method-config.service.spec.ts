import { Roles } from '@darnozom/shared-types';
import { Types } from 'mongoose';
import { PaymentMethodConfigService } from './payment-method-config.service';

const ORG = new Types.ObjectId();
const ACTOR = new Types.ObjectId();

const actor = () => ({ _id: String(ACTOR), organizationId: String(ORG), roleName: Roles.ACCOUNTANT, additionalRoles: [] as Roles[] });

const makeService = ({ existing = [] as Record<string, unknown>[], familyOrgId = String(ORG) as string | null } = {}) => {
  const created: Record<string, unknown>[] = [];
  const store = [...existing];
  const model = {
    create: jest.fn(async (doc: Record<string, unknown>) => {
      const row = { ...doc, _id: new Types.ObjectId() };
      created.push(row);
      store.push(row);
      return row;
    }),
    find: jest.fn(() => ({ lean: () => ({ exec: async () => store }) })),
    findOne: jest.fn((filter: { key?: string }) => ({
      lean: () => ({ exec: async () => store.find((row) => row.key === filter.key) ?? null }),
    })),
  };
  const families = { resolveOrganizationId: jest.fn(async () => familyOrgId) };
  const service = new PaymentMethodConfigService(model as never, families as never);
  return { service, model, created, families };
};

describe('PaymentMethodConfigService.listForOrg', () => {
  it('seeds InstaPay, Wallet Transfer, PayPal and IBAN bank transfer on first call when the org has none', async () => {
    const { service } = makeService({ existing: [] });
    const result = await service.listForOrg(actor());
    expect(result.map((c) => c.key)).toEqual(expect.arrayContaining(['INSTAPAY', 'WALLET_TRANSFER', 'PAYPAL', 'BANK_TRANSFER_IBAN']));
    expect(result.every((c) => c.kind === 'BUILT_IN')).toBe(true);
    const iban = result.find((c) => c.key === 'BANK_TRANSFER_IBAN');
    expect(iban?.fields.map((f) => f.key)).toContain('iban');
    expect(Object.fromEntries(result.map((c) => [c.key, c.enabled]))).toEqual({
      INSTAPAY: false,
      WALLET_TRANSFER: false,
      PAYPAL: true,
      BANK_TRANSFER_IBAN: true,
    });
  });

  it('seeds only the missing built-ins for an org that predates PayPal/IBAN', async () => {
    const { service, model } = makeService({ existing: [{ key: 'INSTAPAY', kind: 'BUILT_IN' }, { key: 'WALLET_TRANSFER', kind: 'BUILT_IN' }] });
    await service.listForOrg(actor());
    expect(model.create).toHaveBeenCalledTimes(2);
  });

  it('does not reseed when all built-ins already exist', async () => {
    const { service, model } = makeService({
      existing: ['INSTAPAY', 'WALLET_TRANSFER', 'PAYPAL', 'BANK_TRANSFER_IBAN'].map((key) => ({ key, kind: 'BUILT_IN' })),
    });
    await service.listForOrg(actor());
    expect(model.create).not.toHaveBeenCalled();
  });

  it('derives the organization from the family when a parent actor carries none', async () => {
    const { service, model, families } = makeService({ existing: [], familyOrgId: String(ORG) });
    const orgLessActor = { ...actor(), organizationId: '', roleName: Roles.PARENT };
    await service.listForOrg(orgLessActor);
    expect(families.resolveOrganizationId).toHaveBeenCalledWith(String(ACTOR));
    expect(model.find).toHaveBeenCalledWith({ organizationId: ORG });
  });

  it('returns nothing for a parent whose family has no organization yet', async () => {
    const { service, families } = makeService({ existing: [], familyOrgId: null });
    const orgLessActor = { ...actor(), organizationId: '', roleName: Roles.PARENT };
    await expect(service.listForOrg(orgLessActor)).resolves.toEqual([]);
    expect(families.resolveOrganizationId).toHaveBeenCalledWith(String(ACTOR));
  });
});

describe('PaymentMethodConfigService.createCustom', () => {
  it('generates a unique key from the label', async () => {
    const { service } = makeService({ existing: [] });
    const created = await service.createCustom(actor(), 'Western Union', []);
    expect(created.kind).toBe('CUSTOM');
    expect(created.key).toMatch(/^CUSTOM_/);
  });
});
