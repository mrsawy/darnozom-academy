import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { UpdateCohortDto } from '../cohort/dto/cohort.dto';
import { UpdateGroupDto } from '../group/dto/group.dto';
import { UpdateLevelDto } from '../level/dto/level.dto';
import { UpdateProgramDto } from '../program/dto/program.dto';

type DtoClass = new () => object;

const fieldErrors = (dto: DtoClass, field: string, value: unknown) =>
  validateSync(plainToInstance(dto, { [field]: value })).filter((e) => e.property === field);

describe('update DTOs', () => {
  it.each<[string, DtoClass, string]>([
    ['group', UpdateGroupDto, 'name'],
    ['group', UpdateGroupDto, 'schedule'],
    ['group', UpdateGroupDto, 'timezone'],
    ['group', UpdateGroupDto, 'minStudents'],
    ['group', UpdateGroupDto, 'maxStudents'],
    ['group', UpdateGroupDto, 'totalSessions'],
    ['program', UpdateProgramDto, 'name'],
    ['cohort', UpdateCohortDto, 'name'],
    ['cohort', UpdateCohortDto, 'startDate'],
    ['level', UpdateLevelDto, 'name'],
    ['level', UpdateLevelDto, 'order'],
  ])('%s.%s rejects null', (_label, dto, field) => {
    expect(fieldErrors(dto, field, null).length).toBeGreaterThan(0);
  });

  it.each<[string, DtoClass, string]>([
    ['group', UpdateGroupDto, 'meetingLink'],
    ['group', UpdateGroupDto, 'whatsappGroupLink'],
    ['program', UpdateProgramDto, 'description'],
  ])('%s.%s accepts null to clear it', (_label, dto, field) => {
    expect(fieldErrors(dto, field, null)).toHaveLength(0);
  });

  it('accepts a partial update and drops cohortId from group updates', () => {
    expect(validateSync(plainToInstance(UpdateGroupDto, { maxStudents: 8 }))).toHaveLength(0);
    expect(
      validateSync(plainToInstance(UpdateGroupDto, { cohortId: '0123456789abcdef01234567' }), { whitelist: true, forbidNonWhitelisted: true })
    ).not.toHaveLength(0);
  });
});

describe('totalSessions bounds', () => {
  it('rejects values outside 1-500', () => {
    expect(fieldErrors(UpdateGroupDto, 'totalSessions', 0).length).toBeGreaterThan(0);
    expect(fieldErrors(UpdateGroupDto, 'totalSessions', 501).length).toBeGreaterThan(0);
    expect(fieldErrors(UpdateGroupDto, 'totalSessions', 12)).toHaveLength(0);
  });
});
