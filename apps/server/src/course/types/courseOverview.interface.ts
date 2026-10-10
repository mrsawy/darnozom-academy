import { Types } from 'mongoose';
import { Course } from '../entities/course.entity';
import { CourseModuleEntity } from '../entities/course-module.entity';
import { CourseContent } from '../entities/course-content.entity';

export interface CourseModuleWithContents extends CourseModuleEntity {
  contentsIds: Types.ObjectId[];
  contents?: CourseContent[];
}

export interface CourseOverview extends Course {
  modules?: CourseModuleWithContents[];
}
