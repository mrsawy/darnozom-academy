import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from '@lms-organization/shared-types/dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {}
