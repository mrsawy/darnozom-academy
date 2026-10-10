import { Currency } from '@lms-organization/shared-types';
import { WalletService } from './wallet.service';
import type { CurrencyService } from 'src/currency/currency.service';

const makeService = (wallet: { balance: number; currency: Currency; save: jest.Mock }) => {
  const currencyService = {
    convertToUSD: jest.fn((amount: number, from: Currency) => (from === Currency.EGP ? amount / 50 : amount)),
    convertFromUSD: jest.fn((amount: number, to: Currency) => (to === Currency.EGP ? amount * 50 : amount)),
  } as unknown as CurrencyService;
  const service = new WalletService({} as never, {} as never, currencyService, {} as never);
  jest.spyOn(service, 'findOne').mockResolvedValue(wallet as never);
  return { service, currencyService };
};

describe('WalletService.changeCurrency', () => {
  it('converts the balance through USD and switches the currency', async () => {
    const wallet = { balance: 500, currency: Currency.EGP, save: jest.fn() };
    wallet.save.mockImplementation(() => Promise.resolve(wallet));
    const { service } = makeService(wallet);
    const session = {} as never;

    await service.changeCurrency('507f1f77bcf86cd799439011', Currency.USD, session);

    expect(wallet.currency).toBe(Currency.USD);
    expect(wallet.balance).toBe(10);
    expect(wallet.save).toHaveBeenCalledWith({ session });
  });

  it('is a no-op when the currency is unchanged', async () => {
    const wallet = { balance: 500, currency: Currency.EGP, save: jest.fn() };
    const { service, currencyService } = makeService(wallet);

    await service.changeCurrency('507f1f77bcf86cd799439011', Currency.EGP);

    expect(wallet.balance).toBe(500);
    expect(wallet.save).not.toHaveBeenCalled();
    expect(currencyService.convertToUSD).not.toHaveBeenCalled();
  });
});
