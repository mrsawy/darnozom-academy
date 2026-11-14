import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BillingErrors, PaymentMethodFieldType } from '@darnozom/shared-types';
import { BillingActor } from '../billing.types';
import { PaymentMethodConfig } from '../entities/payment-method-config.entity';
import { FamilyService } from '../family/family.service';

const oid = (id: string | Types.ObjectId) => (Types.ObjectId.isValid(String(id)) ? new Types.ObjectId(String(id)) : (id as unknown as Types.ObjectId));
const DUPLICATE_KEY = 11_000;

export interface PaymentMethodConfigFieldInput {
  label: string;
  type: PaymentMethodFieldType;
  value: string;
}

export interface PaymentMethodConfigLean {
  _id: Types.ObjectId | string;
  organizationId: Types.ObjectId | string;
  key: string;
  kind: 'BUILT_IN' | 'CUSTOM';
  label: string;
  enabled: boolean;
  fields: { key: string; label: string; type: PaymentMethodFieldType; value: string; order: number }[];
  createdBy: Types.ObjectId | string;
}

type DefaultField = Omit<PaymentMethodConfigLean['fields'][number], 'value' | 'order'>;

const withOrder = (fields: DefaultField[]) => fields.map((f, order) => ({ ...f, order }));

const NUMBER_METHOD_FIELDS = withOrder([
  { key: 'transferNumber', label: 'InstaPay Number', type: PaymentMethodFieldType.TEXT },
  { key: 'accountName', label: 'Account Name', type: PaymentMethodFieldType.TEXT },
  { key: 'qrCodeImage', label: 'QR Code', type: PaymentMethodFieldType.IMAGE },
  { key: 'instructions', label: 'Instructions', type: PaymentMethodFieldType.TEXT },
]);

const PAYPAL_FIELDS = withOrder([
  { key: 'paypalEmail', label: 'PayPal Email', type: PaymentMethodFieldType.TEXT },
  { key: 'paypalLink', label: 'PayPal.me Link', type: PaymentMethodFieldType.LINK },
  { key: 'accountName', label: 'Account Name', type: PaymentMethodFieldType.TEXT },
  { key: 'instructions', label: 'Instructions', type: PaymentMethodFieldType.TEXT },
]);

const BANK_TRANSFER_FIELDS = withOrder([
  { key: 'iban', label: 'IBAN', type: PaymentMethodFieldType.TEXT },
  { key: 'accountName', label: 'Account Holder Name', type: PaymentMethodFieldType.TEXT },
  { key: 'bankName', label: 'Bank Name', type: PaymentMethodFieldType.TEXT },
  { key: 'swift', label: 'SWIFT / BIC', type: PaymentMethodFieldType.TEXT },
  { key: 'instructions', label: 'Instructions', type: PaymentMethodFieldType.TEXT },
]);

const BUILT_INS: { key: string; label: string; enabled: boolean; fields: typeof NUMBER_METHOD_FIELDS }[] = [
  { key: 'INSTAPAY', label: 'InstaPay', enabled: false, fields: NUMBER_METHOD_FIELDS },
  { key: 'WALLET_TRANSFER', label: 'Wallet Transfer', enabled: false, fields: NUMBER_METHOD_FIELDS },
  { key: 'PAYPAL', label: 'PayPal', enabled: true, fields: PAYPAL_FIELDS },
  { key: 'BANK_TRANSFER_IBAN', label: 'تحويل بنكي (IBAN)', enabled: true, fields: BANK_TRANSFER_FIELDS },
];

const toFields = (inputs: PaymentMethodConfigFieldInput[]) =>
  inputs.map((input, index) => ({
    key: `field_${index}`,
    label: input.label,
    type: input.type,
    value: input.value,
    order: index,
  }));

const slugify = (label: string) =>
  label
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

@Injectable()
export class PaymentMethodConfigService {
  constructor(
    @InjectModel(PaymentMethodConfig.name) private readonly model: Model<PaymentMethodConfig>,
    private readonly families: FamilyService
  ) {}

  async listForOrg(actor: BillingActor): Promise<PaymentMethodConfigLean[]> {
    const organizationId = actor.organizationId || (await this.families.resolveOrganizationId(actor._id));
    if (!organizationId) return [];

    const existing = await this.model
      .find({ organizationId: oid(organizationId) })
      .lean<PaymentMethodConfigLean[]>()
      .exec();
    const existingKeys = new Set(existing.map((row) => row.key));
    const missing = BUILT_INS.filter((b) => !existingKeys.has(b.key));
    if (missing.length === 0) return existing;

    const seeded = await Promise.all(
      missing.map((b) =>
        this.model.create({
          organizationId: oid(organizationId),
          key: b.key,
          kind: 'BUILT_IN',
          label: b.label,
          enabled: b.enabled,
          fields: b.fields.map((f) => ({ ...f, value: '' })),
          createdBy: oid(actor._id),
        })
      )
    );
    return [...existing, ...(seeded as unknown as PaymentMethodConfigLean[])];
  }

  async get(actor: BillingActor, configId: string): Promise<PaymentMethodConfigLean> {
    const config = await this.model
      .findOne({ _id: oid(configId), organizationId: oid(actor.organizationId) })
      .lean<PaymentMethodConfigLean | null>()
      .exec();
    if (!config) throw new NotFoundException(BillingErrors.PAYMENT_METHOD_CONFIG_NOT_FOUND);
    return config;
  }

  async upsertFields(actor: BillingActor, configId: string, fields: PaymentMethodConfigFieldInput[]): Promise<PaymentMethodConfigLean> {
    await this.get(actor, configId);
    await this.model.updateOne({ _id: oid(configId), organizationId: oid(actor.organizationId) }, { $set: { fields: toFields(fields) } }).exec();
    return this.get(actor, configId);
  }

  async setEnabled(actor: BillingActor, configId: string, enabled: boolean): Promise<PaymentMethodConfigLean> {
    await this.get(actor, configId);
    await this.model.updateOne({ _id: oid(configId), organizationId: oid(actor.organizationId) }, { $set: { enabled } }).exec();
    return this.get(actor, configId);
  }

  async createCustom(actor: BillingActor, label: string, fields: PaymentMethodConfigFieldInput[]): Promise<PaymentMethodConfigLean> {
    const trimmed = label?.trim();
    if (!trimmed) throw new BadRequestException(BillingErrors.PAYMENT_METHOD_CONFIG_NOT_FOUND);

    const base = `CUSTOM_${slugify(trimmed)}`;
    for (let attempt = 0; attempt < 5; attempt++) {
      const key = attempt === 0 ? base : `${base}_${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      try {
        return (await this.model.create({
          organizationId: oid(actor.organizationId),
          key,
          kind: 'CUSTOM',
          label: trimmed,
          enabled: false,
          fields: toFields(fields),
          createdBy: oid(actor._id),
        })) as unknown as PaymentMethodConfigLean;
      } catch (error) {
        if ((error as { code?: number }).code !== DUPLICATE_KEY) throw error;
      }
    }
    throw new BadRequestException(BillingErrors.PAYMENT_METHOD_CONFIG_NOT_FOUND);
  }
}
