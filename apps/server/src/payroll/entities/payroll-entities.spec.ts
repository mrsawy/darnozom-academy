import { TeacherPayProfileSchema } from './teacher-pay-profile.entity';
import { PayStatementSchema } from './pay-statement.entity';
import { SessionSchema } from '../../academics/session/entities/session.entity';
import { OrganizationSchema } from '../../organization/entities/organization.entity';

describe('payroll entities and schema extensions', () => {
  describe('TeacherPayProfileSchema', () => {
    it('defines the expected compound index', () => {
      const indexes = TeacherPayProfileSchema.indexes();
      const hasCompoundIndex = indexes.some(([fields]) => fields.organizationId === 1 && fields.teacherId === 1 && fields.effectiveFrom === -1);
      expect(hasCompoundIndex).toBe(true);
    });
  });

  describe('PayStatementSchema', () => {
    it('enforces unique statement per teacher per month in an organization', () => {
      const indexes = PayStatementSchema.indexes();
      const uniqueIndex = indexes.find(
        ([fields, options]) => fields.organizationId === 1 && fields.teacherId === 1 && fields.month === 1 && options?.unique === true
      );
      expect(uniqueIndex).toBeDefined();
    });
  });

  describe('SessionSchema dispute extension', () => {
    it('has dispute tracking fields', () => {
      const paths = SessionSchema.paths;
      expect(paths.disputed).toBeDefined();
      expect(paths.disputeReason).toBeDefined();
      expect(paths.disputedBy).toBeDefined();
      expect(paths.disputedAt).toBeDefined();
      expect(paths.disputeResolvedBy).toBeDefined();
      expect(paths.disputeResolvedAt).toBeDefined();
    });
  });

  describe('OrganizationSchema timezone extension', () => {
    it('has timezone field defaulting to UTC', () => {
      const paths = OrganizationSchema.paths;
      expect(paths.timezone).toBeDefined();
      expect(paths.timezone.options.default).toBe('UTC');
    });
  });
});
