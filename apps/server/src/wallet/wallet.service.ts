// src/wallet/wallet.service.ts
import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import mongoose, { ClientSession, PaginateModel, Types, Connection } from 'mongoose';
import { Wallet } from './entities/wallet.entity';
import { randomBytes } from 'node:crypto';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { WalletTransactionDto } from './dto/wallet-transaction.dto';
import { Currency, PaymentMethod, PaymentPurpose, PaymentProvider, WalletErrors, WithdrawalRequestErrors } from '@darnozom/shared-types';
import { CurrencyService } from 'src/currency/currency.service';
import { TransactionService } from 'src/transaction/transaction.service';
import { TransactionType, TransactionStatus, Transaction } from 'src/transaction/entities/transaction.entity';

@Injectable()
export class WalletService {
  constructor(
    @InjectModel(Wallet.name) private walletModel: PaginateModel<Wallet>,
    @InjectConnection() private readonly connection: Connection,
    // @Inject(forwardRef(() => UserService)) private readonly userService: UserService,
    private readonly currencyService: CurrencyService,
    private readonly transactionService: TransactionService
    // @Inject(forwardRef(() => CourseService)) private readonly courseService: CourseService,
  ) {}

  async create(createWalletDto: CreateWalletDto, session?: ClientSession): Promise<Wallet> {
    const existingWallet = await this.walletModel.findOne({
      userId: createWalletDto.userId,
    });

    if (existingWallet) throw new ConflictException('User already has a wallet');

    const walletAddress = this.generateWalletAddress();

    const wallet = new this.walletModel({
      ...createWalletDto,
      walletAddress,
    });

    return await wallet.save({ session });
  }

  /**
   * Switches a wallet to `newCurrency`, converting the balance through USD.
   * No-op when the currency is unchanged. Past transactions keep their own currency.
   */
  async changeCurrency(walletId: string | Types.ObjectId, newCurrency: Currency, session?: ClientSession): Promise<Wallet> {
    const wallet = await this.findOne(walletId.toString(), session);
    if (wallet.currency === newCurrency) return wallet;

    const balanceInUsd = this.currencyService.convertToUSD(wallet.balance, wallet.currency);
    wallet.balance = +this.currencyService.convertFromUSD(balanceInUsd, newCurrency).toFixed(2);
    wallet.currency = newCurrency;

    return await wallet.save({ session });
  }

  async findAll(page = 1, limit = 10): Promise<{ wallets: Wallet[]; total: number }> {
    const skip = (page - 1) * limit;

    const [wallets, total] = await Promise.all([
      this.walletModel.find().skip(skip).limit(limit).populate('userId', 'email username').exec(),
      this.walletModel.countDocuments(),
    ]);

    return { wallets, total };
  }

  async findByUserIdentifier(userId: string): Promise<Wallet> {
    const foundedWallet = await this.filterOne({ userId: new Types.ObjectId(userId) });
    if (!foundedWallet) throw new NotFoundException('Wallet not found');

    return foundedWallet.populate('transactionsHistory');
  }

  async findOne(id: string, session?: ClientSession): Promise<Wallet> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid wallet ID format');
    }

    const wallet = await this.walletModel.findOne({ _id: id }, null, {
      session,
    });

    if (!wallet) throw new NotFoundException(`Wallet with ID ${id} not found`);

    return wallet;
  }

  // async findByCourseId(courseId: string): Promise<Wallet> {
  //   const course = await this.courseService.findOneById(courseId);
  //   if (!course) throw new NotFoundException('Course not found');
  //   const organization = await this.organizationService.findOne(course.organizationId.toString());
  //   if (!organization) throw new NotFoundException('Organization not found');
  //   const wallet = await this.walletModel.findOne({ organizationId: organization._id });
  //   if (!wallet) throw new NotFoundException('Wallet not found');
  //   return wallet;
  // }

  async filterOne(filters: mongoose.RootFilterQuery<Wallet>, session?: ClientSession): Promise<Wallet> {
    const wallet = await this.walletModel.findOne(filters, null, {
      session,
    });

    if (!wallet) throw new NotFoundException('Wallet not found');

    return wallet;
  }

  async findByUserId(userId: string, session?: ClientSession): Promise<Wallet> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID format');
    }

    const wallet = await this.walletModel
      .findOne({ userId: new Types.ObjectId(userId) }, null, { session })
      .populate('user', 'email username')
      .populate(
        'transactionsHistory',
        'amount currency status description reference metadata processedAt purpose paymentMethod paymentProvider externalTransactionId createdAt type balanceBefore balanceAfter'
      )
      .exec();

    if (!wallet) throw new NotFoundException(`Wallet for user ${userId} not found`);

    return wallet;
  }

  async findByWalletAddress(walletAddress: string): Promise<Wallet> {
    const wallet = await this.walletModel.findOne({ walletAddress }).populate('user', 'email username').exec();

    if (!wallet) throw new NotFoundException(`Wallet with address ${walletAddress} not found`);

    return wallet;
  }

  async update(id: string, updateWalletDto: UpdateWalletDto): Promise<Wallet> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid wallet ID format');
    }

    const wallet = await this.walletModel.findByIdAndUpdate(id, updateWalletDto, { new: true }).populate('user', 'email username').exec();

    if (!wallet) throw new NotFoundException(`Wallet with ID ${id} not found`);

    return wallet;
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid wallet ID format');

    const result = await this.walletModel.findByIdAndDelete(id).exec();

    if (!result) throw new NotFoundException(`Wallet with ID ${id} not found`);
  }

  async credit({
    transactionDto,
    fromUserId,
    id,
    userId,
    session: externalSession,
  }: {
    transactionDto: WalletTransactionDto;
    fromUserId?: string;
    id?: string;
    userId?: string;
    session?: ClientSession;
  }): Promise<{ wallet: Wallet; transaction: Transaction }> {
    if (!id && !userId) {
      throw new BadRequestException('Must specify id or userId');
    }

    const session = externalSession ?? (await this.connection.startSession());
    const shouldCommit = !externalSession;

    try {
      if (shouldCommit) session.startTransaction();

      let wallet: Wallet | null = null;
      if (id) {
        wallet = await this.findOne(id, session);
      } else if (userId) {
        wallet = await this.findByUserId(userId, session);
      }
      if (!wallet) throw new NotFoundException('Wallet not found');

      const balanceBefore = wallet.balance;

      // Convert amount to USD if needed
      let amountInUsd = transactionDto.amount;
      if (transactionDto.currency !== Currency.USD) {
        amountInUsd = this.currencyService.convertToUSD(transactionDto.amount, transactionDto.currency);
      }

      // Convert to wallet currency and update balance
      const amountInWalletCurrency = this.currencyService.convertFromUSD(amountInUsd, wallet.currency);

      wallet.balance = +(+wallet.balance + +amountInWalletCurrency).toFixed(2);
      wallet.lastTransactionDate = new Date();

      // Create transaction record
      const transaction = await this.transactionService.create(
        {
          userId: fromUserId ? new Types.ObjectId(fromUserId) : wallet.userId, // Use provided fromUserId or wallet's userId
          toOrganizationId: wallet.organizationId ?? undefined,
          walletId: wallet._id, // Link transaction to the wallet
          type: TransactionType.CREDIT,
          amount: transactionDto.amount,
          currency: transactionDto.currency,
          status: TransactionStatus.COMPLETED,
          balanceBefore,
          balanceAfter: wallet.balance,
          description: transactionDto.description ?? 'Wallet credited',
          reference: transactionDto.reference,
          metadata: transactionDto.metadata,
          processedAt: new Date(),
          purpose: PaymentPurpose.WALLET_CREDIT,
          paymentProvider: transactionDto.metadata?.paymentProvider as PaymentProvider,
          paymentMethod: transactionDto.metadata?.paymentMethod as PaymentMethod,
          externalTransactionId: transactionDto.reference,
        },
        session
      );

      // Add transaction to wallet history
      wallet.transactionsHistoryIds.push(transaction._id);
      await wallet.save({ session });

      if (shouldCommit) {
        await session.commitTransaction();
      }

      return { wallet, transaction };
    } catch (error) {
      if (shouldCommit) {
        await session.abortTransaction();
      }
      throw error;
    } finally {
      if (shouldCommit) {
        await session.endSession();
      }
    }
  }

  async debit({
    transactionDto,
    id,
    userId,
    session: externalSession,
    purpose,
    paymentMethod,
  }: {
    transactionDto: WalletTransactionDto;
    id?: string;
    userId?: string;
    session?: ClientSession;
    purpose: PaymentPurpose;
    paymentMethod: PaymentMethod;
  }): Promise<{ wallet: Wallet; transaction: Transaction }> {
    if (!id && !userId) {
      throw new BadRequestException('Must specify id or userId');
    }

    const session = externalSession ?? (await this.connection.startSession());
    const shouldCommit = !externalSession;

    try {
      if (shouldCommit) session.startTransaction();

      let wallet: Wallet | null = null;
      if (id) {
        wallet = await this.findOne(id, session);
      } else if (userId) {
        wallet = await this.findByUserId(userId, session);
      }

      if (!wallet) throw new NotFoundException(WithdrawalRequestErrors.WALLET_NOT_FOUND);
      if (wallet.isFrozen) throw new BadRequestException(WithdrawalRequestErrors.WALLET_FROZEN);
      if (!wallet.isActive) throw new BadRequestException(WithdrawalRequestErrors.WALLET_NOT_ACTIVE);

      const balanceBefore = wallet.balance;

      // Convert amount to USD if needed
      let amountInUsd = transactionDto.amount;
      if (transactionDto.currency !== Currency.USD) {
        amountInUsd = this.currencyService.convertToUSD(transactionDto.amount, transactionDto.currency);
      }

      // Check sufficient balance
      const walletBalanceInUsd = this.currencyService.convertToUSD(wallet.balance, wallet.currency);

      if (walletBalanceInUsd < amountInUsd) {
        throw new BadRequestException(WalletErrors.INSUFFICIENT_WALLET_BALANCE);
      }

      // Convert to wallet currency and update balance
      const amountInWalletCurrency = this.currencyService.convertFromUSD(amountInUsd, wallet.currency);

      wallet.balance = +(wallet.balance - amountInWalletCurrency).toFixed(2);
      wallet.lastTransactionDate = new Date();

      // Create transaction record
      const transaction = await this.transactionService.create(
        {
          userId: wallet.userId,
          toOrganizationId: wallet.organizationId,
          walletId: wallet._id, // Link transaction to the wallet
          type: TransactionType.DEBIT,
          amount: transactionDto.amount,
          currency: transactionDto.currency,
          status: TransactionStatus.COMPLETED,
          balanceBefore,
          balanceAfter: wallet.balance,
          description: transactionDto.description ?? 'Wallet debited',
          reference: transactionDto.reference,
          metadata: transactionDto.metadata,
          processedAt: new Date(),
          purpose,
          paymentMethod,
        },
        session
      );

      // Add transaction to wallet history
      wallet.transactionsHistoryIds.push(transaction._id);
      await wallet.save({ session });

      if (shouldCommit) {
        await session.commitTransaction();
      }

      return { wallet, transaction };
    } catch (error) {
      if (shouldCommit) {
        await session.abortTransaction();
      }
      throw error;
    } finally {
      if (shouldCommit) {
        await session.endSession();
      }
    }
  }

  // async transfer({
  //   fromWalletId,
  //   toWalletId,
  //   amount,
  //   currency,
  //   description,
  //   reference,
  //   metadata,
  // }: {
  //   fromWalletId: string;
  //   toWalletId: string;
  //   amount: number;
  //   currency: Currency;
  //   description?: string;
  //   reference?: string;
  //   metadata?: Record<string, any>;
  // }): Promise<{ senderWallet: Wallet; recipientWallet: Wallet; transaction: any }> {
  //   const session = await this.connection.startSession();

  //   try {
  //     session.startTransaction();

  //     const senderWallet = await this.findOne(fromWalletId, session);
  //     const recipientWallet = await this.findOne(toWalletId, session);

  //     if (senderWallet.isFrozen || recipientWallet.isFrozen) {
  //       throw new BadRequestException('One or both wallets are frozen');
  //     }

  //     const senderBalanceBefore = senderWallet.balance;
  //     const recipientBalanceBefore = recipientWallet.balance;

  //     // Convert amount to USD
  //     let amountInUsd = amount;
  //     if (currency !== Currency.USD) {
  //       amountInUsd = this.currencyService.convertToUSD(amount, currency);
  //     }

  //     // Check sender's balance
  //     const senderBalanceInUsd = this.currencyService.convertToUSD(
  //       senderWallet.balance,
  //       senderWallet.currency,
  //     );

  //     if (senderBalanceInUsd < amountInUsd) {
  //       throw new BadRequestException('Insufficient balance for transfer');
  //     }

  //     // Debit sender
  //     const debitAmount = this.currencyService.convertFromUSD(
  //       amountInUsd,
  //       senderWallet.currency,
  //     );
  //     senderWallet.balance = +(senderWallet.balance - debitAmount).toFixed(2);
  //     senderWallet.lastTransactionDate = new Date();

  //     // Credit recipient
  //     const creditAmount = this.currencyService.convertFromUSD(
  //       amountInUsd,
  //       recipientWallet.currency,
  //     );
  //     recipientWallet.balance = +(recipientWallet.balance + creditAmount).toFixed(2);
  //     recipientWallet.lastTransactionDate = new Date();

  //     // Create transaction record (ONE transaction for the transfer)
  //     const transaction = await this.transactionService.create(
  //       {
  //         fromUserId: senderWallet.userId,
  //         toOrganizationId: recipientWallet.organizationId || senderWallet.organizationId,
  //         walletId: senderWallet._id, // Primary wallet (sender)
  //         type: TransactionType.TRANSFER,
  //         amount,
  //         currency,
  //         status: TransactionStatus.COMPLETED,
  //         balanceBefore: senderBalanceBefore,
  //         balanceAfter: senderWallet.balance,
  //         description: description || 'Transfer',
  //         reference,
  //         metadata,
  //         senderWalletId: senderWallet._id,
  //         recipientWalletId: recipientWallet._id,
  //         processedAt: new Date(),
  //         purpose: PaymentPurpose.WALLET_CREDIT,
  //         paymentMethod: PaymentMethod.WALLET,
  //       },
  //       session,
  //     );

  //     // Add the SAME transaction ID to both wallets' history
  //     senderWallet.transactionsHistoryIds.push(transaction._id);
  //     recipientWallet.transactionsHistoryIds.push(transaction._id);

  //     await senderWallet.save({ session });
  //     await recipientWallet.save({ session });

  //     await session.commitTransaction();

  //     return { senderWallet, recipientWallet, transaction };
  //   } catch (error) {
  //     await session.abortTransaction();
  //     throw error;
  //   } finally {
  //     session.endSession();
  //   }
  // }

  async freezeWallet(id: string): Promise<Wallet> {
    return await this.update(id, { isFrozen: true });
  }

  async unfreezeWallet(id: string): Promise<Wallet> {
    return await this.update(id, { isFrozen: false });
  }

  async getBalance(id: string): Promise<Wallet> {
    const wallet = await this.findOne(id);
    return wallet;
  }

  private generateWalletAddress(): string {
    const prefix = 'WAL';
    const randomPart = randomBytes(16).toString('hex').toUpperCase();
    return `${prefix}_${randomPart}`;
  }

  async getWalletsByStatus(isActive: boolean, isFrozen?: boolean): Promise<Wallet[]> {
    return await this.walletModel
      .find(isFrozen === undefined ? { isActive } : { isActive, isFrozen })
      .populate('userId', 'email username')
      .exec();
  }

  async getWalletWithTransactions(
    id: string,
    page = 1,
    limit = 10
  ): Promise<{ wallet: Wallet; transactions: { transactions: Transaction[]; total: number } }> {
    const wallet = await this.findOne(id);
    const transactions = await this.transactionService.findByWalletId(id, page, limit);

    return { wallet, transactions };
  }

  async getWalletCurrency(id: string): Promise<Currency> {
    const wallet = await this.findOne(id);
    return wallet.currency;
  }
}
