import { Test, TestingModule } from '@nestjs/testing';
import { AuthControllerHttp } from './controllers/http/auth.controller.http';
import { AuthService } from './auth.service';
import { OAuthProfileService } from './services/oauth-profile.service';
import { AuthSessionService } from './services/auth-session.service';
import { ConfigService } from '@nestjs/config';

describe('AuthControllerHttp', () => {
  let controller: AuthControllerHttp;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthControllerHttp],
      providers: [
        { provide: AuthService, useValue: {} },
        { provide: OAuthProfileService, useValue: {} },
        { provide: AuthSessionService, useValue: {} },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    controller = module.get<AuthControllerHttp>(AuthControllerHttp);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
