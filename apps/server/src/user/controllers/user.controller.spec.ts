import { Test, TestingModule } from '@nestjs/testing';
import { UserControllerHttp } from './http/user.controller.http';
import { UserService } from '../services/user.service';

describe('UserController', () => {
  let controller: UserControllerHttp;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserControllerHttp],
      providers: [UserService],
    }).compile();

    controller = module.get<UserControllerHttp>(UserControllerHttp);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
