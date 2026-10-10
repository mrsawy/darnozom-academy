import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema } from 'mongoose';
import { Discussion } from './discussion.entity';

@Schema()
export class ContentDiscussion extends Discussion {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Course', required: true })
  courseId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'CourseModule', required: true })
  moduleId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'CourseContent', required: true })
  contentId: MongooseSchema.Types.ObjectId;
}

export const ContentDiscussionSchema = SchemaFactory.createForClass(ContentDiscussion);

// Remove 'type' field as it is the discriminator key and should not be redefining it in the discriminator schema
delete ContentDiscussionSchema.paths.type;

// Add indexes
ContentDiscussionSchema.index({ courseId: 1 });
ContentDiscussionSchema.index({ moduleId: 1 });
ContentDiscussionSchema.index({ contentId: 1 });
