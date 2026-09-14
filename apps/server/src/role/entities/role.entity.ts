import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { Actions, ICondition, Roles, Subjects } from '@islamic-academy/shared-types';

export type RoleDocument = Role & Document;

@Schema({ timestamps: true })
export class Role {
  @Prop({ type: String, enum: Roles, required: true, unique: true })
  name: Roles;

  @Prop([
    {
      action: { type: String, enum: Actions, required: true },
      subject: { type: String, enum: Subjects, required: true },
      conditions: {
        type: mongoose.Schema.Types.Mixed,
        required: false,
        default: undefined,
      },
      _id: false,
    },
  ])
  permissions: {
    action: Actions;
    subject: Subjects;
    conditions?: ICondition | ICondition[];
  }[];
}

export const RoleSchema = SchemaFactory.createForClass(Role);
