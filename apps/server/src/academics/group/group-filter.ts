import type { FilterQuery } from 'mongoose';
import type { Group } from './entities/group.entity';
import type { FindGroupsPayload } from './dto/group.dto';

export function buildGroupFilter(query: Pick<FindGroupsPayload, 'atRisk'>): FilterQuery<Group> {
  const filter: FilterQuery<Group> = {};
  if (query.atRisk !== undefined) filter.atRisk = query.atRisk;
  return filter;
}
