import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { OAuthProfileService } from './services/oauth-profile.service';
import { AuthSessionService } from './services/auth-session.service';
import { TokenService } from './services/token.service';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { User } from '../user/entities/user.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { Roles, AuthErrors } from '@darnozom/shared-types';

const mockUser = {
  _id: 'user-id',
  roleName: Roles.GUEST,
  onboardingComplete: false,
  email: 'test@gmail.com',
  googleId: 'google-123',
  authProvider: 'google',
  save: jest.fn().mockResolvedValue(true),
  toObject: jest.fn().mockReturnValue({ _id: 'user-id', roleName: Roles.GUEST }),
  populate: jest.fn().mockResolvedValue({}),
};

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: TokenService,
          useValue: {
            generateToken: jest.fn(),
            generateRefreshToken: jest.fn(),
            verifyAccessToken: jest.fn(),
            verifyRefreshToken: jest.fn(),
            decode: jest.fn(),
          },
        },
        { provide: AuthSessionService, useValue: { rotateSessionAndIssueTokens: jest.fn() } },
        {
          provide: getModelToken(User.name),
          useValue: {
            findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }),
            findById: jest.fn().mockResolvedValue(null),
            updateOne: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: getModelToken(PasswordResetToken.name),
          useValue: {
            findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }),
            create: jest.fn(),
            deleteMany: jest.fn(),
          },
        },
        {
          provide: getConnectionToken(),
          useValue: {
            startSession: jest
              .fn()
              .mockResolvedValue({ startTransaction: jest.fn(), commitTransaction: jest.fn(), abortTransaction: jest.fn(), endSession: jest.fn() }),
          },
        },
        { provide: 'UserService', useValue: {} },
        { provide: 'WalletService', useValue: {} },
        { provide: 'WishlistService', useValue: {} },
        { provide: 'OrganizationService', useValue: {} },
        { provide: 'SubscriptionService', useValue: {} },
        { provide: 'NotificationService', useValue: {} },
        { provide: 'RealtimeService', useValue: {} },
        { provide: 'QueryService', useValue: { findOne: jest.fn(), findOneOrThrow: jest.fn() } },
        { provide: 'EmailService', useValue: {} },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(authService).toBeDefined();
  });
});

describe('OAuthProfileService', () => {
  let oauthService: OAuthProfileService;

  const mockUserModel = {
    findOne: jest.fn(),
    create: jest.fn(),
    prototype: { save: jest.fn() },
  };

  const mockQueryService = {
    findOne: jest.fn(),
  };

  const mockWalletService = {
    create: jest.fn(),
  };

  const mockConnection = {
    startSession: jest.fn().mockResolvedValue({
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      abortTransaction: jest.fn(),
      endSession: jest.fn(),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OAuthProfileService,
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: 'WalletService', useValue: mockWalletService },
        { provide: 'QueryService', useValue: mockQueryService },
        { provide: getConnectionToken(), useValue: mockConnection },
      ],
    }).compile();

    oauthService = module.get<OAuthProfileService>(OAuthProfileService);
  });

  it('should be defined', () => {
    expect(oauthService).toBeDefined();
  });

  it('throws GOOGLE_EMAIL_NOT_VERIFIED if email is not verified', async () => {
    await expect(
      oauthService.findOrCreateGoogleUser({
        providerId: 'google-123',
        email: 'test@gmail.com',
        emailVerified: false,
        firstName: 'Test',
        lastName: 'User',
      })
    ).rejects.toThrow(AuthErrors.GOOGLE_EMAIL_NOT_VERIFIED);
  });

  it('returns existing user if found by googleId', async () => {
    const populatedUser = { ...mockUser };
    mockQueryService.findOne.mockResolvedValueOnce({ toObject: () => populatedUser });

    const result = await oauthService.findOrCreateGoogleUser({
      providerId: 'google-123',
      email: 'test@gmail.com',
      emailVerified: true,
      firstName: 'Test',
      lastName: 'User',
    });

    expect(result).toEqual(populatedUser);
  });
});
