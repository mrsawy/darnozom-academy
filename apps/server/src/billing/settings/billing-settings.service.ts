import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PaymentProvider } from '@darnozom/shared-types';
import { Organization } from 'src/organization/entities/organization.entity';
import { BillingActor } from '../billing.types';
import { UpdateBillingSettingsPayload } from '../dto/billing.dto';

const oid = (id: string | Types.ObjectId) => (Types.ObjectId.isValid(String(id)) ? new Types.ObjectId(String(id)) : (id as unknown as Types.ObjectId));

export interface BillingSettingsView {
  enabledFamilyPaymentMethods: string[];
  academyFeeGatewayProvider: PaymentProvider | null;
}

@Injectable()
export class BillingSettingsService {
  constructor(@InjectModel(Organization.name) private readonly orgModel: Model<Organization>) {}

  async get(actor: BillingActor): Promise<BillingSettingsView> {
    const org = await this.orgModel
      .findOne({ _id: oid(actor.organizationId) })
      .lean<{ enabledFamilyPaymentMethods?: string[]; academyFeeGatewayProvider?: PaymentProvider | null } | null>()
      .exec();
    return {
      enabledFamilyPaymentMethods: org?.enabledFamilyPaymentMethods ?? [],
      academyFeeGatewayProvider: org?.academyFeeGatewayProvider ?? null,
    };
  }

  async update(actor: BillingActor, dto: UpdateBillingSettingsPayload): Promise<BillingSettingsView> {
    await this.orgModel
      .updateOne(
        { _id: oid(actor.organizationId) },
        { $set: { enabledFamilyPaymentMethods: dto.enabledFamilyPaymentMethods, academyFeeGatewayProvider: dto.academyFeeGatewayProvider ?? null } }
      )
      .exec();
    return this.get(actor);
  }
}
