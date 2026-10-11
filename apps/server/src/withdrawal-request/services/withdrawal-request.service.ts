import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { PaginateModel, Types } from 'mongoose';
import { WithdrawalRequest } from '../entities/withdrawal-request.entity';
import { CreateWithdrawalRequestDto } from '../dto/create-withdrawal-request.dto';
import { UpdateWithdrawalRequestDto } from '../dto/update-withdrawal-request.dto';
import { ProcessWithdrawalRequestDto } from '../dto/process-withdrawal-request.dto';
import { WalletService } from 'src/wallet/wallet.service';
import { Currency, WithdrawalRequestErrors, WithdrawalRequestStatus, PaymentMethod, PaymentPurpose } from '@darnozom/shared-types';

@Injectable()
export class WithdrawalRequestService {
  constructor(
    @InjectModel(WithdrawalRequest.name)
    private readonly withdrawalRequestModel: PaginateModel<WithdrawalRequest>,
    private readonly walletService: WalletService
  ) {}

  async create(userId: string, dto: CreateWithdrawalRequestDto): Promise<WithdrawalRequest> {
    const wallet = await this.walletService.findByUserId(userId);

    if (!wallet) throw new NotFoundException(WithdrawalRequestErrors.WALLET_NOT_FOUND);
    if (wallet.isFrozen) throw new BadRequestException(WithdrawalRequestErrors.WALLET_FROZEN);
    if (!wallet.isActive) throw new BadRequestException(WithdrawalRequestErrors.WALLET_NOT_ACTIVE);

    if (wallet.balance < dto.amount) {
      throw new BadRequestException(WithdrawalRequestErrors.INSUFFICIENT_BALANCE_FOR_WITHDRAWAL);
    }

    const request = new this.withdrawalRequestModel({
      userId: new Types.ObjectId(userId),
      walletId: wallet._id,
      amount: dto.amount,
      currency: dto.currency,
      method: dto.method,
      methodDetails: dto.methodDetails,
      userNote: dto.userNote,
      status: WithdrawalRequestStatus.PENDING,
    });

    return request.save();
  }

  async findAll(page = 1, limit = 10, status?: WithdrawalRequestStatus): Promise<{ docs: WithdrawalRequest[]; total: number }> {
    const filter = status ? { status } : {};

    const result = await this.withdrawalRequestModel.paginate(filter, {
      page,
      limit,
      populate: [
        { path: 'userId', select: 'firstName lastName email username profile' },
        { path: 'walletId', select: 'balance currency' },
      ],
      sort: { createdAt: -1 },
    });

    return { docs: result.docs, total: result.totalDocs };
  }

  async findByUser(userId: string, page = 1, limit = 10): Promise<{ docs: WithdrawalRequest[]; total: number }> {
    const result = await this.withdrawalRequestModel.paginate(
      { userId: new Types.ObjectId(userId) },
      {
        page,
        limit,
        sort: { createdAt: -1 },
      }
    );

    return { docs: result.docs, total: result.totalDocs };
  }

  async findOne(id: string): Promise<WithdrawalRequest> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(WithdrawalRequestErrors.INVALID_WITHDRAWAL_REQUEST_ID);
    }

    const request = await this.withdrawalRequestModel
      .findById(id)
      .populate('userId', 'firstName lastName email username profile')
      .populate('walletId', 'balance currency')
      .populate('processedBy', 'firstName lastName email');

    if (!request) throw new NotFoundException(WithdrawalRequestErrors.WITHDRAWAL_REQUEST_NOT_FOUND);

    return request;
  }

  async findOneForUser(id: string, userId: string): Promise<WithdrawalRequest> {
    const request = await this.findOne(id);

    if (request.userId.toString() !== userId) {
      throw new ForbiddenException(WithdrawalRequestErrors.WITHDRAWAL_REQUEST_ACCESS_DENIED);
    }

    return request;
  }

  async update(id: string, userId: string, dto: UpdateWithdrawalRequestDto): Promise<WithdrawalRequest> {
    const request = await this.findOneForUser(id, userId);

    if (request.status !== WithdrawalRequestStatus.PENDING) {
      throw new BadRequestException(WithdrawalRequestErrors.ONLY_PENDING_WITHDRAWAL_REQUESTS_EDITABLE);
    }

    Object.assign(request, dto);
    return request.save();
  }

  async cancel(id: string, userId: string): Promise<WithdrawalRequest> {
    const request = await this.findOneForUser(id, userId);

    if (request.status !== WithdrawalRequestStatus.PENDING) {
      throw new BadRequestException(WithdrawalRequestErrors.ONLY_PENDING_WITHDRAWAL_REQUESTS_CANCELLABLE);
    }

    request.status = WithdrawalRequestStatus.CANCELLED;
    return request.save();
  }

  async process(id: string, adminId: string, dto: ProcessWithdrawalRequestDto): Promise<WithdrawalRequest> {
    const request = await this.findOne(id);

    if (request.status !== WithdrawalRequestStatus.PENDING) {
      throw new BadRequestException(WithdrawalRequestErrors.ONLY_PENDING_WITHDRAWAL_REQUESTS_PROCESSABLE);
    }

    if (dto.status === WithdrawalRequestStatus.APPROVED) {
      await this.walletService.debit({
        transactionDto: {
          amount: request.amount,
          currency: request.currency as Currency,
          description: `Withdrawal request approved - ${request.method}`,
          reference: request._id.toString(),
        },
        userId: request.userId.toString(),
        purpose: PaymentPurpose.WALLET_WITHDRAWAL,
        paymentMethod: PaymentMethod.DIRECT,
      });
    }

    request.status = dto.status;
    request.adminNote = dto.adminNote;
    request.proofImageKeys = dto.proofImageKeys ?? [];
    request.processedBy = new Types.ObjectId(adminId);
    request.processedAt = new Date();

    return request.save();
  }
}
