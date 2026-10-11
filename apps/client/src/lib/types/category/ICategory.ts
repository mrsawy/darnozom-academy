import type { ApprovalStatusType as ApprovalStatus } from '@darnozom/shared-types';

export interface ICategory {
  _id: string;
  name: string;
  description: string;
  parentId?: string | null;
  organizationId?: string;
  childCategories: ICategory[];
  parentCategory?: ICategory;
  approvalStatus?: ApprovalStatus;
  approvalComment?: string;
  pendingUpdate?: Record<string, unknown> | null;
  coursesCount?: number;
  instructorsCount?: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}
