import { Controller, UseGuards } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { PlatformAdminGuard } from 'src/admin-review/guards/platform-admin.guard';
import { RpcValidationPipe } from 'src/utils/RpcValidationPipe';
import { ApplyRpcErrorHandling } from 'src/utils/docerators/error-handeling/class/ApplyRpcErrorHandling.decorator';
import { OptionsService } from './options.service';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

class UpsertOptionPayload {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsNotEmpty()
  value: unknown;

  @IsString()
  @IsOptional()
  organizationId?: string;
}

@ApplyRpcErrorHandling
@Controller()
export class OptionsControllerMessage {
  constructor(private readonly optionsService: OptionsService) {}

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('options.findPlatformOptions')
  async findPlatformOptions() {
    return this.optionsService.findPlatformOptions();
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('options.upsert')
  async upsert(@Payload(new RpcValidationPipe()) payload: UpsertOptionPayload) {
    return this.optionsService.upsert(payload.key, payload.value, payload.organizationId);
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('options.delete')
  async remove(@Payload(new RpcValidationPipe()) payload: { id: string }) {
    return this.optionsService.remove(payload.id);
  }
}
