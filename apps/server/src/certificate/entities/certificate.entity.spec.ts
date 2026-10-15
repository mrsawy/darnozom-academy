import { Certificate, CertificateSchema } from './certificate.entity';
import { Counter, CounterSchema } from './counter.entity';
import { Level, LevelSchema } from 'src/academics/level/entities/level.entity';
import { GroupStudent, GroupStudentSchema } from 'src/academics/group/entities/group.entity';
import { Organization, OrganizationSchema } from 'src/organization/entities/organization.entity';
import { CertificateStatus, FinalResult } from '@darnozom/shared-types';

describe('certificate schemas and entities', () => {
  it('defines Certificate schema with compound index on { groupId: 1, studentId: 1 }', () => {
    expect(CertificateSchema).toBeDefined();
    const indexes = CertificateSchema.indexes();
    const hasUniqueGroupStudent = indexes.some(
      ([idx, opts]) => idx.groupId === 1 && idx.studentId === 1 && opts?.unique === true,
    );
    expect(hasUniqueGroupStudent).toBe(true);

    const hasOrgStatus = indexes.some(
      ([idx]) => idx.organizationId === 1 && idx.status === 1,
    );
    expect(hasOrgStatus).toBe(true);
  });

  it('defines Counter schema with compound index on { organizationId: 1, key: 1 }', () => {
    expect(CounterSchema).toBeDefined();
    const indexes = CounterSchema.indexes();
    const hasUniqueOrgKey = indexes.some(
      ([idx, opts]) => idx.organizationId === 1 && idx.key === 1 && opts?.unique === true,
    );
    expect(hasUniqueOrgKey).toBe(true);
  });

  it('includes certificateRules in Level schema', () => {
    const paths = LevelSchema.paths;
    expect(paths['certificateRules']).toBeDefined();
    const rulesPaths = (paths['certificateRules'] as any).schema.paths;
    expect(rulesPaths['minAttendancePercent']).toBeDefined();
    expect(rulesPaths['minHomeworkAverage']).toBeDefined();
    expect(rulesPaths['requireExamPass']).toBeDefined();
    expect(rulesPaths['requireFullyPaid']).toBeDefined();
  });

  it('includes finalResult fields in GroupStudent schema', () => {
    const paths = GroupStudentSchema.paths;
    expect(paths['finalResult']).toBeDefined();
    expect(paths['finalResultBy']).toBeDefined();
    expect(paths['finalResultAt']).toBeDefined();
  });

  it('includes shortCode in Organization schema', () => {
    const paths = OrganizationSchema.paths;
    expect(paths['shortCode']).toBeDefined();
  });
});
