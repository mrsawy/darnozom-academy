import { Test, TestingModule } from '@nestjs/testing';
import { EnrollmentHttpController } from './enrollment.http.controller';
import { EnrollmentService } from '../services/enrollment.service';

describe('EnrollmentController', () => {
  let controller: EnrollmentHttpController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EnrollmentHttpController],
      providers: [EnrollmentService],
    }).compile();

    controller = module.get<EnrollmentHttpController>(EnrollmentHttpController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
