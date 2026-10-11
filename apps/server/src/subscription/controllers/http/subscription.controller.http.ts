import { Controller, Get, Post, Body, Patch, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RequirePermissionsGuard } from 'src/role/permission.decorator';
import { Actions, Subjects } from '@darnozom/shared-types';
import { handleError } from 'src/utils/errorHandling';
import { IUserRequest } from 'src/auth/interfaces/IUserRequest.interface';
import { SubscriptionService } from '../../services/subscription.service';
import { CreateSubscriptionDto } from '../../dto/create-subscription.dto';
import { UpdateSubscriptionDto } from '../../dto/update-subscription.dto';

@Controller('subscription')
export class SubscriptionControllerHttp {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @UseGuards(AuthGuard)
  @RequirePermissionsGuard({ action: Actions.CREATE, subject: Subjects.PLAN })
  @Post()
  async create(@Body() dto: CreateSubscriptionDto, @Request() req: IUserRequest) {
    try {
      const organizationId = req.user.organizationId?.toString() ?? dto.organizationId;
      const created = await this.subscriptionService.create({
        ...dto,
        organizationId,
      });
      return {
        message: 'Subscription created successfully',
        subscription: created,
      };
    } catch (error: unknown) {
      handleError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  @UseGuards(AuthGuard)
  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.PLAN })
  @Get()
  async findAll(@Request() req: IUserRequest) {
    try {
      const organizationId = req.user.organizationId?.toString();
      if (!organizationId) {
        return this.subscriptionService.findAll({ page: 1, limit: 10 });
      }
      return this.subscriptionService.findByOrganization(organizationId, {
        page: 1,
        limit: 20,
      });
    } catch (error: unknown) {
      handleError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  @UseGuards(AuthGuard)
  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.PLAN })
  @Get('active')
  async findActive(@Request() req: IUserRequest) {
    try {
      const organizationId = req.user.organizationId?.toString();
      if (!organizationId) return null;
      return this.subscriptionService.findActiveByOrganization(organizationId);
    } catch (error: unknown) {
      handleError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  @UseGuards(AuthGuard)
  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.PLAN })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      return this.subscriptionService.findOne(id);
    } catch (error: unknown) {
      handleError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  @UseGuards(AuthGuard)
  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.PLAN })
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateSubscriptionDto) {
    try {
      const updated = await this.subscriptionService.update(id, dto);
      return {
        message: 'Subscription updated successfully',
        subscription: updated,
      };
    } catch (error: unknown) {
      handleError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  @UseGuards(AuthGuard)
  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.PLAN })
  @Post(':id/cancel')
  async cancel(@Param('id') id: string) {
    try {
      const updated = await this.subscriptionService.cancel(id);
      return {
        message: 'Subscription cancelled successfully',
        subscription: updated,
      };
    } catch (error: unknown) {
      handleError(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
