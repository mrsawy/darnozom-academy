import { BadRequestException, Inject, Injectable, Optional } from '@nestjs/common';
import { BillingErrors } from '@darnozom/shared-types';
import { FAMILY_PAYMENT_METHODS, FamilyPaymentMethod, OrganizationForBilling } from './payment-method.interface';

@Injectable()
export class FamilyPaymentMethodRegistry {
  private readonly byKey: Map<string, FamilyPaymentMethod>;

  constructor(@Optional() @Inject(FAMILY_PAYMENT_METHODS) methods: FamilyPaymentMethod[] = []) {
    this.byKey = new Map(methods.map((method) => [method.key, method]));
  }

  get(key: string): FamilyPaymentMethod {
    const method = this.byKey.get(key);
    if (!method) throw new BadRequestException(BillingErrors.PAYMENT_METHOD_UNKNOWN);
    return method;
  }

  /** What this organization offers a parent right now. */
  listEnabled(org: OrganizationForBilling): FamilyPaymentMethod[] {
    return [...this.byKey.values()].filter((method) => method.isEnabled(org));
  }

  /** Every method registered in code. */
  listAll(): FamilyPaymentMethod[] {
    return [...this.byKey.values()];
  }
}
