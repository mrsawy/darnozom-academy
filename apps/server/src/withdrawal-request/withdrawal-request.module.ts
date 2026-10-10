import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WithdrawalRequest, WithdrawalRequestSchema } from './entities/withdrawal-request.entity';
import { WithdrawalRequestService } from './services/withdrawal-request.service';
import { WithdrawalRequestMessageController } from './controllers/withdrawal-request.controller.message';
import { WalletModule } from 'src/wallet/wallet.module';
import { AuthModule } from 'src/auth/auth.module';
import { RoleModule } from 'src/role/role.module';

@Module({
  imports: [MongooseModule.forFeature([{ name: WithdrawalRequest.name, schema: WithdrawalRequestSchema }]), WalletModule, AuthModule, RoleModule],
  controllers: [WithdrawalRequestMessageController],
  providers: [WithdrawalRequestService],
  exports: [WithdrawalRequestService],
})
export class WithdrawalRequestModule {}
