import { IsArray, IsMongoId, IsNumber, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ChatAttachmentDto {
  @IsString()
  fileKey: string;

  @IsString()
  fileName: string;

  @IsString()
  mimeType: string;

  @IsNumber()
  @Min(0)
  size: number;
}

export class SendMessageDto {
  @IsMongoId()
  recipientId: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  content?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatAttachmentDto)
  attachments?: ChatAttachmentDto[];
}

export class GetConversationsDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;
}

export class GetMessagesDto {
  @IsMongoId()
  conversationId: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;
}

export class MarkConversationReadDto {
  @IsMongoId()
  conversationId: string;
}

export class EnsureConversationDto {
  @IsMongoId()
  recipientId: string;
}
