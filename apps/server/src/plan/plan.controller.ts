import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { PlanService } from './plan.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { PlatformAdminGuard } from 'src/admin-review/guards/platform-admin.guard';
import { RequirePermissionsGuard } from 'src/role/permission.decorator';
import { Actions, Subjects } from '@darnozom/shared-types';

@Controller('plan')
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  @RequirePermissionsGuard({ action: Actions.CREATE, subject: Subjects.PLAN })
  @UseGuards(AuthGuard, PlatformAdminGuard)
  @Post()
  async create(@Body() createPlanDto: CreatePlanDto) {
    return this.planService.create(createPlanDto);
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.PLAN })
  @UseGuards(AuthGuard)
  @Get()
  findAll() {
    return this.planService.findAll();
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.PLAN })
  @UseGuards(AuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.planService.findOne(id);
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.PLAN })
  @UseGuards(AuthGuard, PlatformAdminGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePlanDto: UpdatePlanDto) {
    return this.planService.update(id, updatePlanDto);
  }

  @RequirePermissionsGuard({ action: Actions.DELETE, subject: Subjects.PLAN })
  @UseGuards(AuthGuard, PlatformAdminGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.planService.remove(id);
  }
}
