import { Test, TestingModule } from '@nestjs/testing';
import { CategoryHttpController } from './category.controller.http';
import { CategoryService } from './category.service';

describe('CategoryController', () => {
  let controller: CategoryHttpController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoryHttpController],
      providers: [CategoryService],
    }).compile();

    controller = module.get<CategoryHttpController>(CategoryHttpController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
