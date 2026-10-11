import { IsNotEmpty, IsEnum, IsArray, ArrayMinSize, ArrayMaxSize, IsString } from 'class-validator';
import { IdentityDocumentType } from '@darnozom/shared-types';

export class SubmitIdentityDto {
  @IsNotEmpty()
  @IsEnum(IdentityDocumentType)
  documentType: IdentityDocumentType;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  fileKeys: string[];
}
