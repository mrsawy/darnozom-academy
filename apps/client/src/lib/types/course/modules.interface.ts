import { IContent } from './content.interface';
import type { IUserReview } from '../review/review.types';
import type { ApprovalStatusType as ApprovalStatus } from '@lms-organization/shared-types';
import { PublishStatus } from '@lms-organization/shared-types';

/** Embedded settings on modules (extend as needed). */
export interface IModuleContentSettings {}

export interface IModule {
  _id: string;
  title: string;
  description?: string;
  learningObjectives: string[];
  contentsIds: string[];
  createdBy: string;
  approvalStatus?: ApprovalStatus;
  publishStatus?: PublishStatus;
  publishedAt?: string | null;
  settings?: IModuleContentSettings;
  // contents: [];
}

export interface IModuleWithContents extends IModule {
  contents: IContent[];
  /** Current user's review for this module (detailed enrolled course). */
  userReview?: IUserReview | null;
}
