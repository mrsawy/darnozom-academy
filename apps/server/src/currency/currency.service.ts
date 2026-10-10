// services/currency.service.ts
import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { CURRENCIES, Currency, type ExchangeRates } from '@lms-organization/shared-types';

@Injectable()
export class CurrencyService {
  private exchangeRates = new Map<string, number>();

  constructor() {
    void this.updateExchangeRates(); // Initial load
    setInterval(() => {
      void this.updateExchangeRates();
    }, 3_600_000); // Update hourly
  }

  async updateExchangeRates(): Promise<void> {
    try {
      const response = await axios.get<{ result?: string; rates?: Record<string, number> }>(
        process.env.EXCHANGE_RATES_URL ?? 'https://open.er-api.com/v6/latest/USD',
        {
          timeout: 30_000, // 30s; only hits on real network/API issues
        }
      );
      if (response.status !== 200 || response.data?.result !== 'success') {
        throw new Error('Invalid response from exchange rate API');
      }

      const rates = response.data.rates;
      if (rates) {
        for (const currency of Object.keys(rates)) {
          this.exchangeRates.set(currency, rates[currency] ?? 1);
        }
      }
    } catch (error) {
      // Error logging should use a logger service in production
      // eslint-disable-next-line no-console
      console.error('Failed to update exchange rates:', error);
    }
  }

  getExchangeRate(fromCurrency: Currency, toCurrency: Currency): number {
    if (fromCurrency === toCurrency) return 1;

    if (fromCurrency === Currency.USD) {
      return this.exchangeRates.get(toCurrency) ?? 1;
    }

    if (toCurrency === Currency.USD) {
      const rate = this.exchangeRates.get(fromCurrency);
      return rate ? 1 / rate : 1;
    }

    // For non-USD pairs, convert through USD
    const usdToFrom = this.exchangeRates.get(fromCurrency) ?? 1;
    const usdToTo = this.exchangeRates.get(toCurrency) ?? 1;
    return usdToTo / usdToFrom;
  }

  /** Cached USD-based rates for the currencies we support (omits any not loaded yet). */
  getRates(): ExchangeRates {
    const rates: ExchangeRates = { [Currency.USD]: 1 };
    for (const currency of CURRENCIES) {
      const rate = this.exchangeRates.get(currency);
      if (rate) rates[currency] = rate;
    }
    return rates;
  }

  convertToUSD(amount: number, fromCurrency: Currency): number {
    if (fromCurrency === Currency.USD) return amount;
    const rate = this.exchangeRates.get(fromCurrency);
    return rate ? amount / rate : amount;
  }

  convertFromUSD(amount: number, toCurrency: Currency): number {
    if (toCurrency === Currency.USD) return amount;
    const rate = this.exchangeRates.get(toCurrency);
    return rate ? amount * rate : amount;
  }
}
