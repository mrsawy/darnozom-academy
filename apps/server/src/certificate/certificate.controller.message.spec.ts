import 'reflect-metadata';
import { PATTERN_METADATA } from '@nestjs/microservices/constants';
import { Actions, Subjects } from '@darnozom/shared-types';
import { PERMISSIONS_KEY } from 'src/role/permission.decorator';
import { CertificateControllerMessage } from './certificate.controller.message';

const proto = CertificateControllerMessage.prototype as unknown as Record<string, (...args: unknown[]) => unknown>;

const guardedEndpoints: [string, string, Actions, Subjects][] = [
  ['evaluate', 'certificates.evaluate', Actions.UPDATE, Subjects.GROUP],
  ['list', 'certificates.list', Actions.READ, Subjects.CERTIFICATE],
  ['findOne', 'certificates.findOne', Actions.READ, Subjects.CERTIFICATE],
  ['updateName', 'certificates.updateName', Actions.UPDATE, Subjects.CERTIFICATE],
  ['confirmName', 'certificates.confirmName', Actions.UPDATE, Subjects.CERTIFICATE],
  ['issue', 'certificates.issue', Actions.UPDATE, Subjects.GROUP],
];

describe('CertificateControllerMessage', () => {
  it.each(guardedEndpoints)(
    '%s answers %s and requires %s %s',
    (method, pattern, action, subject) => {
      expect(Reflect.getMetadata(PATTERN_METADATA, proto[method])).toEqual([pattern]);
      expect(Reflect.getMetadata(PERMISSIONS_KEY, proto[method])).toEqual([{ action, subject }]);
    },
  );

  it('verifyPublic is public (no permission guard) and answers certificates.verifyPublic', () => {
    expect(Reflect.getMetadata(PATTERN_METADATA, proto['verifyPublic'])).toEqual(['certificates.verifyPublic']);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, proto['verifyPublic'])).toBeUndefined();
  });

  it('exposes exactly the documented handlers', () => {
    const handlers = Object.getOwnPropertyNames(CertificateControllerMessage.prototype).filter(
      (name) => name !== 'constructor',
    );
    const expectedMethods = [...guardedEndpoints.map(([method]) => method), 'verifyPublic'];
    expect(handlers.sort()).toEqual(expectedMethods.sort());
  });

  it('delegates to service methods', async () => {
    const mockService = {
      evaluateGroup: jest.fn().mockResolvedValue([]),
      find: jest.fn().mockResolvedValue([]),
      findById: jest.fn().mockResolvedValue({}),
      updateName: jest.fn().mockResolvedValue({}),
      confirmName: jest.fn().mockResolvedValue({}),
      issueCertificate: jest.fn().mockResolvedValue({}),
      verifyPublic: jest.fn().mockResolvedValue({}),
    };

    const controller = new CertificateControllerMessage(mockService as never);
    const userContext = {
      userPayload: { _id: '64b0000000000000000000aa', organizationId: '64b0000000000000000000bb', roleName: 'MANAGER' },
    } as any;

    await controller.evaluate({ id: '64b000000000000000000011' }, userContext);
    expect(mockService.evaluateGroup).toHaveBeenCalled();

    await controller.list({ groupId: '64b000000000000000000011' }, userContext);
    expect(mockService.find).toHaveBeenCalled();

    await controller.findOne({ id: '64b000000000000000000077' }, userContext);
    expect(mockService.findById).toHaveBeenCalled();

    await controller.updateName(
      { id: '64b000000000000000000077', nameAr: 'أحمد', nameEn: 'Ahmad' },
      userContext,
    );
    expect(mockService.updateName).toHaveBeenCalled();

    await controller.confirmName({ id: '64b000000000000000000077' }, userContext);
    expect(mockService.confirmName).toHaveBeenCalled();

    await controller.issue({ id: '64b000000000000000000077' }, userContext);
    expect(mockService.issueCertificate).toHaveBeenCalled();

    await controller.verifyPublic({ token: 'test-token' });
    expect(mockService.verifyPublic).toHaveBeenCalledWith('test-token');
  });
});
