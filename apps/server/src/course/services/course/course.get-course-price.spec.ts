import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CourseErrors, Currency } from '@darnozom/shared-types';
import { BillingCycle } from 'src/utils/enums/billingCycle.enum';
import { CourseService } from './course.service';

describe('CourseService.getCoursePrice', () => {
  const convertFromUSD = jest.fn((amount: number) => amount);

  const service = new CourseService(
    undefined as never,
    undefined as never,
    undefined as never,
    undefined as never,
    undefined as never,
    undefined as never,
    { convertFromUSD } as never,
    undefined as never,
    undefined as never,
    undefined as never,
    undefined as never,
    undefined as never
  );

  const mockCourse = (course: Record<string, unknown>) => jest.spyOn(service, 'findOneById').mockResolvedValue(course as never);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('returns price 0 for free courses without reading pricing', async () => {
    mockCourse({
      _id: 'free-course',
      isPaid: false,
      pricing: undefined,
      name: 'Free Course',
    });

    const result = await service.getCoursePrice({
      courseId: 'free-course',
      billingCycle: BillingCycle.ONE_TIME,
      currency: Currency.EGP,
    });

    expect(result.price).toBe(0);
    expect(result.course).toMatchObject({ isPaid: false });
  });

  it('throws when paid course has no pricing object', async () => {
    mockCourse({
      _id: 'paid-course',
      isPaid: true,
      pricing: undefined,
      name: 'Broken Paid Course',
    });

    await expect(
      service.getCoursePrice({
        courseId: 'paid-course',
        billingCycle: BillingCycle.ONE_TIME,
        currency: Currency.EGP,
      })
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.getCoursePrice({
        courseId: 'paid-course',
        billingCycle: BillingCycle.ONE_TIME,
        currency: Currency.EGP,
      })
    ).rejects.toMatchObject({
      response: { message: CourseErrors.COURSE_PRICE_NOT_AVAILABLE },
    });
  });

  it('throws when selected billing cycle is missing from pricing', async () => {
    mockCourse({
      _id: 'paid-course',
      isPaid: true,
      pricing: {
        [BillingCycle.MONTHLY]: {
          originalPrice: 100,
          originalCurrency: Currency.EGP,
          priceUSD: 3,
        },
      },
      name: 'Monthly Only',
    });

    await expect(
      service.getCoursePrice({
        courseId: 'paid-course',
        billingCycle: BillingCycle.ONE_TIME,
        currency: Currency.EGP,
      })
    ).rejects.toMatchObject({
      response: { message: CourseErrors.COURSE_PRICE_NOT_AVAILABLE },
    });
  });

  it('returns original currency price when available', async () => {
    mockCourse({
      _id: 'paid-course',
      isPaid: true,
      pricing: {
        [BillingCycle.ONE_TIME]: {
          originalPrice: 200,
          originalCurrency: Currency.EGP,
          priceUSD: 6,
          discountPercentage: 0,
        },
      },
      name: 'Paid Course',
    });

    const result = await service.getCoursePrice({
      courseId: 'paid-course',
      billingCycle: BillingCycle.ONE_TIME,
      currency: Currency.EGP,
    });

    expect(result.price).toBe(200);
    expect(result.course).toMatchObject({ isPaid: true });
  });

  it('throws NotFound when course is missing', async () => {
    jest.spyOn(service, 'findOneById').mockRejectedValue(new NotFoundException(CourseErrors.COURSE_NOT_FOUND));

    await expect(
      service.getCoursePrice({
        courseId: 'missing',
        billingCycle: BillingCycle.ONE_TIME,
        currency: Currency.EGP,
      })
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
