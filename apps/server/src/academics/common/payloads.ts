import { IsMongoId } from 'class-validator';

export class IdPayload {
  @IsMongoId()
  id!: string;
}
