import { IsEnum, IsMongoId, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { TemplateContext } from '@darnozom/shared-types';

export class CreateMessageTemplateDtoServer {
  @IsString() @MinLength(1) @MaxLength(100) name: string;
  @IsEnum(['STUDENT', 'GROUP'] as TemplateContext[]) context: TemplateContext;
  @IsString() @MinLength(1) @MaxLength(2000) body: string;
}

export class UpdateMessageTemplateDtoServer {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(100) name?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(2000) body?: string;
}

export class RenderMessageTemplateDtoServer {
  @IsMongoId() groupId: string;
  @IsOptional() @IsMongoId() studentId?: string;
}

export class MessageTemplateIdPayload {
  @IsMongoId() id: string;
}

export class RenderMessageTemplatePayload extends RenderMessageTemplateDtoServer {
  @IsMongoId() id: string;
}

export class UpdateMessageTemplatePayload extends MessageTemplateIdPayload {
  dto: UpdateMessageTemplateDtoServer;
}
