import { Paginated } from '../Paginated';
import { IUser } from '../user/user.interface';

export enum DiscussionType {
  COURSE = 'CourseDiscussion',
  MODULE = 'ModuleDiscussion',
  CONTENT = 'ContentDiscussion',
}

export interface IDiscussion {
  _id: string;
  type: DiscussionType;
  userId: string;
  content: string;
  parentId: string | null;
  likesCount: number;
  repliesCount: number;
  likedBy: string[];
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  user?: IUser;

  // Type-specific fields
  courseId?: string;
  moduleId?: string;
  contentId?: string;
}

export interface IDiscussionWithReplies extends IDiscussion {
  replies?: IDiscussionWithReplies[];
  children?: IDiscussionWithReplies[];
}

export interface CreateDiscussionInput {
  type: DiscussionType;
  content: string;
  /** Always the course id (matches server `CreateDiscussionDto.courseId`). */
  courseId: string;
  moduleId?: string;
  contentId?: string;
  parentId?: string;
}

export interface GetDiscussionsInput {
  type: DiscussionType;
  entityId: string;
  moduleId?: string;
  contentId?: string;
  parentId?: string;
  page?: number;
  limit?: number;
}

export interface UpdateDiscussionInput {
  content: string;
}

export type DiscussionsResponse = Paginated<IDiscussionWithReplies>;
