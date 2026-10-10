import { PartialType } from '@nestjs/mapped-types';
import { IsMongoId, IsOptional } from 'class-validator';
import { CreatePrivateSessionDto } from './create-private-session.dto';

export class UpdatePrivateSessionDto extends PartialType(CreatePrivateSessionDto) {
  @IsMongoId()
  @IsOptional()
  sessionId?: string;
}
