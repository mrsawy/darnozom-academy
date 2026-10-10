import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { CurrencyService } from '../../currency.service';

@Controller()
export class CurrencyControllerMessage {
  constructor(private readonly currencyService: CurrencyService) {}

  /** Public: lets clients show prices in the viewer's currency using the same rates we charge with. */
  @MessagePattern('currency.getRates')
  getRates() {
    return { rates: this.currencyService.getRates() };
  }
}
