import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WalletService } from './wallet.service';
import { WalletHttpController } from './wallet.http.controller';
import { WalletMessageController } from './wallet.message.controller';
import { Wallet, WalletSchema } from './entities/wallet.entity';
import { CurrencyModule } from 'src/currency/currency.module';
import { TransactionModule } from 'src/transaction/transaction.module';
import { AuthModule } from 'src/auth/auth.module';
import { RoleModule } from 'src/role/role.module';
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Wallet.name, schema: WalletSchema }]),
    CurrencyModule,
    TransactionModule,
    forwardRef(() => AuthModule),
    RoleModule,
  ],
  controllers: [WalletHttpController, WalletMessageController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
