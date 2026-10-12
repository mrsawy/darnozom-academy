import { Roles } from '@darnozom/shared-types';
import { IUserContext } from 'src/utils/types/IUserContext.interface';
import { UserControllerMessage } from './user.controller.message';

// @nestjs/mapped-types is ESM-only (createRequire + import.meta) and Jest cannot load it; DTO shapes don't matter here.
jest.mock('@nestjs/mapped-types', () => {
  // eslint-disable-next-line unicorn/consistent-function-scoping -- jest.mock factories are hoisted and cannot reference outer-scope helpers
  const passThrough = (base: new () => object) => base;
  return { PartialType: passThrough, OmitType: passThrough, PickType: passThrough, IntersectionType: passThrough };
});

const ORG_ID = '0123456789abcdef01234567';
const USER_ID = '89abcdef0123456701234567';

const build = () => {
  const userService = { update: jest.fn().mockResolvedValue({ message: 'ok' }) };
  const controller = new UserControllerMessage(userService as never, {} as never, {} as never, {} as never, {} as never);
  const context = { userPayload: { _id: USER_ID, organizationId: ORG_ID } } as unknown as IUserContext;
  return { controller, userService, context };
};

describe('generic user updates cannot grant roles', () => {
  it('user.updateOwnData drops roleName and additionalRoles', async () => {
    const { controller, userService, context } = build();
    await controller.updateOwnData(context, {
      firstName: 'Sara',
      roleName: Roles.OWNER,
      additionalRoles: [Roles.OWNER],
    } as never);
    expect(userService.update).toHaveBeenCalledWith(expect.anything(), { firstName: 'Sara' });
  });

  it('users.organizationUpdateUser drops additionalRoles (only users.setAdditionalRoles may set them)', async () => {
    const { controller, userService, context } = build();
    await controller.organizationUpdateUser(context, {
      userId: USER_ID,
      userData: { firstName: 'Sara', additionalRoles: [Roles.OWNER] } as never,
    });
    expect(userService.update).toHaveBeenCalledWith(expect.anything(), { firstName: 'Sara' });
  });
});
