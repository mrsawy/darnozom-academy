import { PartialType } from '@nestjs/mapped-types';
import { CreateSchoolTypeDto } from './create-school-type.dto';

export class UpdateSchoolTypeDto extends PartialType(CreateSchoolTypeDto) {}
