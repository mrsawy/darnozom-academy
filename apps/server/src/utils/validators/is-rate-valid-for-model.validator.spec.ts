import { validate } from 'class-validator';
import { GroupPayModel } from '@darnozom/shared-types';
import { IsRateValidForModel } from './is-rate-valid-for-model.validator';

class RuleDto {
  model: GroupPayModel;

  @IsRateValidForModel('model')
  rate: number;
}

const make = (model: GroupPayModel, rate: number) => Object.assign(new RuleDto(), { model, rate });

describe('IsRateValidForModel', () => {
  it('accepts a percentage up to 100', async () => {
    expect(await validate(make(GroupPayModel.PERCENT_OF_SUBSCRIPTIONS, 100))).toHaveLength(0);
  });

  it('rejects a percentage above 100', async () => {
    expect(await validate(make(GroupPayModel.PERCENT_OF_SUBSCRIPTIONS, 100.5))).toHaveLength(1);
  });

  it('accepts a large money amount for a fixed model', async () => {
    expect(await validate(make(GroupPayModel.FIXED_PER_GROUP, 5000))).toHaveLength(0);
    expect(await validate(make(GroupPayModel.FIXED_PER_SUBSCRIPTION, 250))).toHaveLength(0);
  });

  it('rejects a negative rate for every model', async () => {
    expect(await validate(make(GroupPayModel.FIXED_PER_GROUP, -1))).toHaveLength(1);
  });
});
