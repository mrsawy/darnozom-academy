import { buildGroupFilter } from './group-filter';

describe('buildGroupFilter atRisk', () => {
  it('leaves the filter alone when atRisk is not asked for', () => {
    expect(buildGroupFilter({})).not.toHaveProperty('atRisk');
  });

  it('matches only flagged groups when atRisk is true', () => {
    expect(buildGroupFilter({ atRisk: true }).atRisk).toBe(true);
  });

  it('matches only healthy groups when atRisk is false', () => {
    expect(buildGroupFilter({ atRisk: false }).atRisk).toBe(false);
  });
});
