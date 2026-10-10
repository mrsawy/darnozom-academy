import { Test, TestingModule } from '@nestjs/testing';
import { DiscussionControllerHttp } from './discussion.controller.http';
import { DiscussionService } from './discussion.service';

describe('DiscussionControllerHttp', () => {
  let controller: DiscussionControllerHttp;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DiscussionControllerHttp],
      providers: [DiscussionService],
    }).compile();

    controller = module.get<DiscussionControllerHttp>(DiscussionControllerHttp);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
