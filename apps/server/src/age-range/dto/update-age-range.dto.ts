import { PartialType } from '@nestjs/mapped-types';
import { CreateAgeRangeDto } from './create-age-range.dto';

export class UpdateAgeRangeDto extends PartialType(CreateAgeRangeDto) {}
