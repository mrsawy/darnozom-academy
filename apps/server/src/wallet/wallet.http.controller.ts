// Updated wallet.controller.ts example methods
import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { WalletTransactionDto } from './dto/wallet-transaction.dto';

@Controller('wallets')
export class WalletHttpController {
  constructor(private readonly walletService: WalletService) {}

  @Post()
  create(@Body() createWalletDto: CreateWalletDto) {
    return this.walletService.create(createWalletDto);
  }

  @Get()
  findAll(@Query('page') page: number, @Query('limit') limit: number) {
    return this.walletService.findAll(page, limit);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.walletService.findOne(id);
  }

  @Get(':id/with-transactions')
  getWalletWithTransactions(@Param('id') id: string, @Query('page') page = 1, @Query('limit') limit = 10) {
    return this.walletService.getWalletWithTransactions(id, page, limit);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateWalletDto: UpdateWalletDto) {
    return this.walletService.update(id, updateWalletDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.walletService.remove(id);
  }

  @Post(':id/credit')
  credit(@Param('id') id: string, @Body() transactionDto: WalletTransactionDto) {
    return this.walletService.credit({ transactionDto, id });
  }

  // @Post(':id/debit')
  // debit(@Param('id') id: string, @Body() transactionDto: WalletTransactionDto) {
  //   return this.walletService.debit({ transactionDto, id });
  // }

  // @Post('transfer')
  // transfer(@Body() transferDto: TransferWalletDto) {
  //   return this.walletService.transfer(transferDto);
  // }

  @Patch(':id/freeze')
  freeze(@Param('id') id: string) {
    return this.walletService.freezeWallet(id);
  }

  @Patch(':id/unfreeze')
  unfreeze(@Param('id') id: string) {
    return this.walletService.unfreezeWallet(id);
  }

  @Get(':id/balance')
  getBalance(@Param('id') id: string) {
    return this.walletService.getBalance(id);
  }
}
