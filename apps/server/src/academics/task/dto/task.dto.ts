import { IsEnum, IsMongoId, IsOptional } from 'class-validator';
import { TaskStatus } from '@darnozom/shared-types';

export class FindTasksPayload {
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsMongoId()
  groupId?: string;
}

export class GroupTasksPayload {
  @IsMongoId()
  groupId!: string;
}
