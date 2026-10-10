import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BillingCycle, Currency } from '@lms-organization/shared-types';
import { CreateCourseDto } from './create-course.dto';

async function pricingErrors(pricing: Record<string, unknown>): Promise<boolean> {
  const dto = plainToInstance(CreateCourseDto, { name: 'C', isPaid: true, pricing });
  return (await validate(dto)).some((e) => e.property === 'pricing');
}

describe('PricingDetailsDto minimum paid price', () => {
  it('accepts a price at the minimum', async () => {
    expect(await pricingErrors({ [BillingCycle.ONE_TIME]: { originalPrice: 50, originalCurrency: Currency.EGP } })).toBe(false);
  });

  it('rejects a paid price below the minimum', async () => {
    expect(await pricingErrors({ [BillingCycle.ONE_TIME]: { originalPrice: 20, originalCurrency: Currency.EGP } })).toBe(true);
  });

  it('applies the minimum per currency', async () => {
    expect(await pricingErrors({ [BillingCycle.ONE_TIME]: { originalPrice: 1, originalCurrency: Currency.USD } })).toBe(false);
    expect(await pricingErrors({ [BillingCycle.ONE_TIME]: { originalPrice: 0.5, originalCurrency: Currency.USD } })).toBe(true);
  });

  it('allows 0 as free', async () => {
    expect(await pricingErrors({ [BillingCycle.ONE_TIME]: { originalPrice: 0, originalCurrency: Currency.EGP } })).toBe(false);
  });

  it('rejects a price that falls below the minimum after discount', async () => {
    expect(await pricingErrors({ [BillingCycle.ONE_TIME]: { originalPrice: 100, originalCurrency: Currency.EGP, discountPercentage: 75 } })).toBe(
      true
    );
    expect(await pricingErrors({ [BillingCycle.ONE_TIME]: { originalPrice: 100, originalCurrency: Currency.EGP, discountPercentage: 40 } })).toBe(
      false
    );
  });

  it('checks every billing cycle', async () => {
    expect(
      await pricingErrors({
        [BillingCycle.ONE_TIME]: { originalPrice: 100, originalCurrency: Currency.EGP },
        [BillingCycle.MONTHLY]: { originalPrice: 10, originalCurrency: Currency.EGP },
      })
    ).toBe(true);
  });
});
