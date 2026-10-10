import { Module } from '@nestjs/common';
import { CurrencyService } from './currency.service';
import { CurrencyControllerMessage } from './controllers/message/currency.controller.message';

@Module({
  controllers: [CurrencyControllerMessage],
  providers: [CurrencyService],
  exports: [CurrencyService],
})
export class CurrencyModule {}
