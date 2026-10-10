import { IsString, IsOptional } from 'class-validator';

export class AdminSuspendActionDto {
  @IsString()
  entityId: string;

  @IsString()
  @IsOptional()
  reason?: string;
}
