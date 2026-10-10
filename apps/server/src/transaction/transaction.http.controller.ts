// src/transaction/transaction.controller.ts
import { Controller, Get, Param, Query } from '@nestjs/common';
import { TransactionService } from './transaction.service';

@Controller('transactions')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Get('wallet/:walletId')
  async findByWallet(@Param('walletId') walletId: string, @Query('page') page = 1, @Query('limit') limit = 10) {
    return this.transactionService.findByWalletId(walletId, page, limit);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.transactionService.findOne(id);
  }

  @Get('wallet/:walletId/stats')
  async getStats(@Param('walletId') walletId: string) {
    return this.transactionService.getWalletTransactionStats(walletId);
  }

  @Get('reference/:reference')
  async findByReference(@Param('reference') reference: string) {
    return this.transactionService.findByReference(reference);
  }
}
