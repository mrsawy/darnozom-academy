import { PartialType } from '@nestjs/mapped-types';
import { CreateWalletDto } from './create-wallet.dto';
import { IsBoolean, IsOptional } from 'class-validator';
export class UpdateWalletDto extends PartialType(CreateWalletDto) {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  isFrozen?: boolean;
}
