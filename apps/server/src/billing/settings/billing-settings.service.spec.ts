import { Roles } from '@darnozom/shared-types';
import { Types } from 'mongoose';
import { BillingSettingsService } from './billing-settings.service';

const ORG = new Types.ObjectId();
const ACTOR = new Types.ObjectId();

const actor = () => ({ _id: String(ACTOR), organizationId: String(ORG), roleName: Roles.ACCOUNTANT, additionalRoles: [] as Roles[] });

const oid = (id: string | Types.ObjectId) => (Types.ObjectId.isValid(String(id)) ? new Types.ObjectId(String(id)) : (id as unknown as Types.ObjectId));

const makeService = (org: Record<string, unknown> = { enabledFamilyPaymentMethods: ['RECEIPT_UPLOAD'], academyFeeGatewayProvider: null }) => {
  const orgModel = {
    findOne: jest.fn(() => ({ lean: () => ({ exec: async () => org }) })),
    updateOne: jest.fn(() => ({ exec: async () => ({ modifiedCount: 1 }) })),
  };
  const service = new BillingSettingsService(orgModel as never);
  return { service, orgModel };
};

describe('BillingSettingsService.get', () => {
  it('reads the organization’s current settings', async () => {
    const { service } = makeService({ enabledFamilyPaymentMethods: ['RECEIPT_UPLOAD'], academyFeeGatewayProvider: null });
    await expect(service.get(actor())).resolves.toEqual({ enabledFamilyPaymentMethods: ['RECEIPT_UPLOAD'], academyFeeGatewayProvider: null });
  });
});

describe('BillingSettingsService.update', () => {
  it('persists enabled methods and gateway provider to the organization', async () => {
    const { service, orgModel } = makeService();
    await service.update(actor(), { enabledFamilyPaymentMethods: ['RECEIPT_UPLOAD', 'MANUAL_TRANSFER'], academyFeeGatewayProvider: null });
    expect(orgModel.updateOne).toHaveBeenCalledWith(
      { _id: oid(ORG) },
      { $set: { enabledFamilyPaymentMethods: ['RECEIPT_UPLOAD', 'MANUAL_TRANSFER'], academyFeeGatewayProvider: null } }
    );
  });
});
