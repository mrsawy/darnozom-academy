import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ProjectSubmission, ProjectSubmissionSchema } from './projectSubmission.entity';

@Schema({ _id: false })
export class Project extends Document {
  @Prop({ required: true, type: Date })
  dueDate: Date;

  @Prop({ type: Number, default: 100 })
  maxPoints?: number;

  @Prop({ type: String, required: true })
  requirements: string;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: [String], default: [] })
  deliverables?: string[];

  @Prop({ type: Boolean, default: false })
  isGroupProject?: boolean;

  @Prop({ type: Number, min: 1 })
  maxGroupSize?: number;

  @Prop({ type: [ProjectSubmissionSchema], default: [] })
  submissions: ProjectSubmission[];
}

export const ProjectSchema = SchemaFactory.createForClass(Project);

ProjectSchema.pre('validate', function (next) {
  if (this.isGroupProject && (!this.maxGroupSize || this.maxGroupSize < 2)) {
    return next(new Error('maxGroupSize must be at least 2 for group projects.'));
  }
  next();
});
