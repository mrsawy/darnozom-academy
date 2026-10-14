import { IsInt, IsMongoId, IsString, Min, MinLength } from 'class-validator';

export class ShariaVersionPayload {
  @IsMongoId()
  contentId: string;

  @IsInt()
  @Min(1)
  version: number;
}

export class ShariaRejectPayload extends ShariaVersionPayload {
  @IsString()
  @MinLength(1)
  comment: string;
}

export class ShariaContentPayload {
  @IsMongoId()
  contentId: string;
}
