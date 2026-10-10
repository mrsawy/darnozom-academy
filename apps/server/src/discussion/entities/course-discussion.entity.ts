import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema } from 'mongoose';
import { Discussion } from './discussion.entity';

@Schema()
export class CourseDiscussion extends Discussion {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Course', required: true })
  courseId: MongooseSchema.Types.ObjectId;
}

export const CourseDiscussionSchema = SchemaFactory.createForClass(CourseDiscussion);

// Remove 'type' field as it is the discriminator key and should not be redefining it in the discriminator schema
delete CourseDiscussionSchema.paths.type;

// Add index
CourseDiscussionSchema.index({ courseId: 1 });
