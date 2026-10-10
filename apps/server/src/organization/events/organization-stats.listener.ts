import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { Organization } from '../entities/organization.entity';
import { COURSE_CREATED_EVENT, CourseCreatedEvent } from './organization-stats.events';
import { COURSE_DELETED_EVENT, CourseDeletedEvent } from 'src/subscription/events/course-deleted.event';

@Injectable()
export class OrganizationStatsListener {
  constructor(@InjectModel(Organization.name) private readonly organizationModel: Model<Organization>) {}

  @OnEvent(COURSE_CREATED_EVENT)
  async handleCourseCreated(event: CourseCreatedEvent): Promise<void> {
    await this.organizationModel.updateOne({ _id: new mongoose.Types.ObjectId(event.organizationId) }, { $inc: { 'stats.totalCourses': 1 } });
  }

  @OnEvent(COURSE_DELETED_EVENT)
  async handleCourseDeleted(event: CourseDeletedEvent): Promise<void> {
    await this.organizationModel.updateOne(
      { _id: new mongoose.Types.ObjectId(event.organizationId) },
      { $inc: { 'stats.totalCourses': -event.count } }
    );
  }
}
