import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

@Schema({ timestamps: true })
export class AssignmentSubmission extends Document {
  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  studentId: Types.ObjectId;

  @Prop({ type: String })
  fileKey?: string;

  @Prop({ type: Number })
  fileSizeBytes?: number;

  @Prop({ type: String })
  mimeType?: string;

  @Prop({ type: String })
  content?: string;

  @Prop({ type: Number })
  score: number;

  @Prop({ type: String })
  feedback?: string;

  @Prop({ type: Date, default: Date.now })
  submittedAt: Date;

  @Prop({ type: String, required: true })
  studentName: string;
}

export const AssignmentSubmissionSchema = SchemaFactory.createForClass(AssignmentSubmission);
AssignmentSubmissionSchema.plugin(mongoosePaginate);
