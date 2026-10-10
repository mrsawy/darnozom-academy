import { Controller, Get, Param, Query } from '@nestjs/common';
import { InstructorService } from '../../services/instructor.service';
import mongoose from 'mongoose';
import { handleError } from 'src/utils/errorHandling';
import { FindInstructorsDto } from '../../dto/find-instructors.dto';

@Controller('instructor')
export class InstructorControllerHttp {
  constructor(private readonly instructorService: InstructorService) {}

  @Get()
  async findAll(@Query() query: FindInstructorsDto) {
    try {
      const { page, limit, ...filters } = query;
      // The service builds the Mongo query from these flat filters (search escaping,
      // rating $gte, subject/grade/school-type $in) — no query construction here.
      return await this.instructorService.findAll({ page, limit }, filters);
    } catch (error: unknown) {
      if (error instanceof Error) {
        handleError(error);
      } else {
        handleError(String(error));
      }
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const filters: mongoose.RootFilterQuery<unknown> = { _id: new mongoose.Types.ObjectId(id) };

      return await this.instructorService.filterOne(filters);
    } catch (error: unknown) {
      if (error instanceof Error) {
        handleError(error);
      } else {
        handleError(String(error));
      }
    }
  }
}
