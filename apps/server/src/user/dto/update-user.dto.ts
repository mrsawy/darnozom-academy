import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from '@darnozom/shared-types/dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {}
