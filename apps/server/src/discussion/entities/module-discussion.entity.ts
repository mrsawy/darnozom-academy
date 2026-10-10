import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema } from 'mongoose';
import { Discussion } from './discussion.entity';

@Schema()
export class ModuleDiscussion extends Discussion {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Course', required: true })
  courseId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'CourseModule', required: true })
  moduleId: MongooseSchema.Types.ObjectId;
}

export const ModuleDiscussionSchema = SchemaFactory.createForClass(ModuleDiscussion);

// Remove 'type' field as it is the discriminator key and should not be redefining it in the discriminator schema
delete ModuleDiscussionSchema.paths.type;

// Add indexes
ModuleDiscussionSchema.index({ courseId: 1 });
ModuleDiscussionSchema.index({ moduleId: 1 });
