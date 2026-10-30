import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PaymentMethodFieldType } from '@darnozom/shared-types';

@Schema({ _id: false })
export class PaymentMethodConfigField {
  @Prop({ type: String, required: true })
  key: string;

  @Prop({ type: String, required: true })
  label: string;

  @Prop({ type: String, enum: Object.values(PaymentMethodFieldType), required: true })
  type: PaymentMethodFieldType;

  @Prop({ type: String, default: '' })
  value: string;

  @Prop({ type: Number, required: true })
  order: number;
}

export const PaymentMethodConfigFieldSchema = SchemaFactory.createForClass(PaymentMethodConfigField);

/** An admin-configured way for a parent to pay by manual transfer: InstaPay, Wallet Transfer, or a custom method. */
@Schema({ timestamps: true })
export class PaymentMethodConfig extends Document<Types.ObjectId> {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: Types.ObjectId;

  /** Stable identifier: 'INSTAPAY' | 'WALLET_TRANSFER' | a generated slug for a custom method. */
  @Prop({ type: String, required: true })
  key: string;

  @Prop({ type: String, enum: ['BUILT_IN', 'CUSTOM'], required: true })
  kind: 'BUILT_IN' | 'CUSTOM';

  @Prop({ type: String, required: true })
  label: string;

  @Prop({ type: Boolean, default: false })
  enabled: boolean;

  @Prop({ type: [PaymentMethodConfigFieldSchema], default: [] })
  fields: PaymentMethodConfigField[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;
}

export const PaymentMethodConfigSchema = SchemaFactory.createForClass(PaymentMethodConfig);
PaymentMethodConfigSchema.index({ organizationId: 1, key: 1 }, { unique: true, name: 'payment_method_config_unique_key' });
