import { Test, TestingModule } from '@nestjs/testing';
import { ReviewControllerHttp } from './review.controller.http';
import { ReviewService } from '../service/review.service';

describe('ReviewController', () => {
  let controller: ReviewControllerHttp;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReviewControllerHttp],
      providers: [ReviewService],
    }).compile();

    controller = module.get<ReviewControllerHttp>(ReviewControllerHttp);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
