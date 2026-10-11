import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AcademicsErrors, Roles } from '@darnozom/shared-types';
import { UserService } from './user.service';

function serviceWith(found: unknown) {
  const userModel = {
    findOne: jest.fn().mockReturnValue({ lean: () => ({ exec: jest.fn().mockResolvedValue(found) }) }),
    updateOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({ matchedCount: 1 }) }),
  };
  const service = Object.create(UserService.prototype) as UserService;
  (service as unknown as { userModel: unknown }).userModel = userModel;
  return { service, userModel };
}

describe('UserService.setAdditionalRoles', () => {
  const orgId = '64b000000000000000000001';
  const userId = '64b000000000000000000002';

  it('saves valid additional roles for a user in the same organization', async () => {
    const { service, userModel } = serviceWith({ _id: userId, roleName: Roles.COORDINATOR });
    await expect(service.setAdditionalRoles(orgId, userId, [Roles.INSTRUCTOR])).resolves.toEqual({ additionalRoles: [Roles.INSTRUCTOR] });
    expect(userModel.findOne.mock.calls[0][0]).toMatchObject({ deletedAt: null });
    expect(String(userModel.findOne.mock.calls[0][0].organizationId)).toBe(orgId);
    expect(userModel.updateOne.mock.calls[0][1]).toEqual({ $set: { additionalRoles: [Roles.INSTRUCTOR] } });
  });

  it('rejects users outside the organization', async () => {
    const { service } = serviceWith(null);
    await expect(service.setAdditionalRoles(orgId, userId, [])).rejects.toThrow(new NotFoundException(AcademicsErrors.USER_NOT_FOUND_IN_ORGANIZATION));
  });

  it('rejects invalid combinations', async () => {
    const { service, userModel } = serviceWith({ _id: userId, roleName: Roles.STUDENT });
    await expect(service.setAdditionalRoles(orgId, userId, [Roles.INSTRUCTOR])).rejects.toThrow(new BadRequestException(AcademicsErrors.ADDITIONAL_ROLES_INVALID));
    expect(userModel.updateOne).not.toHaveBeenCalled();
  });
});
