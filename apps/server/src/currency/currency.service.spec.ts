import { Test, TestingModule } from '@nestjs/testing';
import { Currency } from '@lms-organization/shared-types';
import { CurrencyService } from './currency.service';

function loadRates(service: CurrencyService, rates: Record<string, number>) {
  const map = (service as unknown as { exchangeRates: Map<string, number> }).exchangeRates;
  for (const [currency, rate] of Object.entries(rates)) map.set(currency, rate);
}

describe('CurrencyService', () => {
  let service: CurrencyService;

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.spyOn(CurrencyService.prototype, 'updateExchangeRates').mockResolvedValue();
    const module: TestingModule = await Test.createTestingModule({
      providers: [CurrencyService],
    }).compile();

    service = module.get<CurrencyService>(CurrencyService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getRates', () => {
    it('returns only supported currencies, with USD pinned to 1', () => {
      loadRates(service, { EGP: 50, SAR: 3.75, USD: 1, EUR: 0.9 });
      expect(service.getRates()).toEqual({
        [Currency.USD]: 1,
        [Currency.EGP]: 50,
        [Currency.SAR]: 3.75,
      });
    });

    it('omits currencies whose rate has not loaded yet', () => {
      expect(service.getRates()).toEqual({ [Currency.USD]: 1 });
    });
  });
});
