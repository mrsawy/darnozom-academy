import { Test, TestingModule } from '@nestjs/testing';

import { WalletService } from './wallet.service';
import { WalletHttpController } from './wallet.http.controller';

describe('WalletController', () => {
  let controller: WalletHttpController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WalletHttpController],
      providers: [WalletService],
    }).compile();

    controller = module.get<WalletHttpController>(WalletHttpController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
