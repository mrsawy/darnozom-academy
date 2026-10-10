import { Test, TestingModule } from '@nestjs/testing';
import { PageControllerMessage } from './page.controller.message';
import { PageService } from './page.service';

describe('PageControllerMessage', () => {
  let controller: PageControllerMessage;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PageControllerMessage],
      providers: [PageService],
    }).compile();

    controller = module.get<PageControllerMessage>(PageControllerMessage);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
