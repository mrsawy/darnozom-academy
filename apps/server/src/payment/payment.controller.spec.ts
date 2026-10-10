import { Test, TestingModule } from '@nestjs/testing';
import { PaymentHttpController } from './controllers/payment.http.controller';
import { PaymentOrchestratorService } from './services/payment-orchestrator.service';

describe('PaymentHttpController', () => {
  let controller: PaymentHttpController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentHttpController],
      providers: [PaymentOrchestratorService],
    }).compile();

    controller = module.get<PaymentHttpController>(PaymentHttpController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
