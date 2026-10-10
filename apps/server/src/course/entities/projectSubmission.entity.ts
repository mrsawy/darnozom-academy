import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, _id: false })
export class ProjectSubmission extends Document {
  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  studentId: Types.ObjectId;

  @Prop({ type: [Types.ObjectId], default: [] })
  groupMembers?: Types.ObjectId[];

  @Prop({ type: String, required: true })
  fileUrl: string;

  @Prop({ type: String })
  repositoryUrl?: string;

  @Prop({ type: String })
  liveDemoUrl?: string;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: Number })
  score?: number;

  @Prop({ type: String })
  feedback?: string;
}

export const ProjectSubmissionSchema = SchemaFactory.createForClass(ProjectSubmission);

ProjectSubmissionSchema.pre('validate', function (next) {
  if (!this.fileUrl && !this.repositoryUrl && !this.liveDemoUrl) {
    return next(new Error('At least one fileUrl, repositoryUrl, or liveDemoUrl must be provided.'));
  }
  next();
});
