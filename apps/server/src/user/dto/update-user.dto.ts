import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from '@islamic-academy/shared-types/dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {}
