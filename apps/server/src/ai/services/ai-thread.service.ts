import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { PaginateModel, Types } from 'mongoose';
import { AiThread, AiThreadDocument } from '../entities/ai-thread.entity';

@Injectable()
export class AiThreadService {
  constructor(@InjectModel(AiThread.name) private readonly model: PaginateModel<AiThreadDocument>) {}

  async list(userId: string, page = 1, limit = 20) {
    const result = await this.model.paginate({ userId: new Types.ObjectId(userId) }, { page, limit, sort: { updatedAt: -1 }, lean: true });

    return {
      threads: result.docs.map((t) => ({
        remoteId: t._id.toString(),
        externalId: undefined as string | undefined,
        title: t.title ?? undefined,
        status: t.status,
      })),
      hasMore: result.hasNextPage,
      total: result.totalDocs,
    };
  }

  async create(userId: string) {
    const thread = await this.model.create({
      userId: new Types.ObjectId(userId),
      title: 'New Thread',
      status: 'regular',
      messages: [],
    });
    return { remoteId: thread._id.toString(), externalId: undefined as string | undefined };
  }

  async fetch(remoteId: string, userId: string) {
    const thread = await this.model
      .findOne({
        _id: new Types.ObjectId(remoteId),
        userId: new Types.ObjectId(userId),
      })
      .lean();

    if (!thread) throw new NotFoundException('AI thread not found');
    return {
      remoteId: thread._id.toString(),
      externalId: undefined as string | undefined,
      title: thread.title ?? undefined,
      status: thread.status,
    };
  }

  async rename(remoteId: string, userId: string, title: string) {
    await this.model.updateOne({ _id: new Types.ObjectId(remoteId), userId: new Types.ObjectId(userId) }, { $set: { title } });
  }

  async archive(remoteId: string, userId: string) {
    await this.model.updateOne({ _id: new Types.ObjectId(remoteId), userId: new Types.ObjectId(userId) }, { $set: { status: 'archived' } });
  }

  async unarchive(remoteId: string, userId: string) {
    await this.model.updateOne({ _id: new Types.ObjectId(remoteId), userId: new Types.ObjectId(userId) }, { $set: { status: 'regular' } });
  }

  async delete(remoteId: string, userId: string) {
    await this.model.deleteOne({
      _id: new Types.ObjectId(remoteId),
      userId: new Types.ObjectId(userId),
    });
  }

  async getMessages(remoteId: string, userId: string): Promise<unknown[]> {
    const thread = await this.model
      .findOne({
        _id: new Types.ObjectId(remoteId),
        userId: new Types.ObjectId(userId),
      })
      .lean();

    if (!thread) return [];
    return thread.messages ?? [];
  }

  /**
   * Paginate linear `messages` array: default = latest `limit` messages.
   * With `beforeMessageId`, returns up to `limit` messages strictly older than that id (exclusive end index).
   */
  async getMessagesPage(
    remoteId: string,
    userId: string,
    limit: number,
    beforeMessageId?: string
  ): Promise<{ messages: unknown[]; hasMore: boolean }> {
    const thread = await this.model
      .findOne({
        _id: new Types.ObjectId(remoteId),
        userId: new Types.ObjectId(userId),
      })
      .lean();

    if (!thread) {
      return { messages: [], hasMore: false };
    }

    const all = thread.messages ?? [];
    if (all.length === 0) {
      return { messages: [], hasMore: false };
    }

    const cap = Math.min(Math.max(limit, 1), 100);

    if (!beforeMessageId) {
      const slice = all.slice(-cap);
      return { messages: slice, hasMore: all.length > slice.length };
    }

    const idx = all.findIndex((m) => m !== null && typeof m === 'object' && 'id' in m && String((m as { id?: string }).id) === beforeMessageId);

    if (idx <= 0) {
      return { messages: [], hasMore: false };
    }

    const start = Math.max(0, idx - cap);
    const slice = all.slice(start, idx);
    return { messages: slice, hasMore: start > 0 };
  }

  async saveMessages(remoteId: string, userId: string, messages: unknown[]) {
    await this.model.updateOne({ _id: new Types.ObjectId(remoteId), userId: new Types.ObjectId(userId) }, { $set: { messages } });
  }

  async updateTitle(remoteId: string, userId: string, title: string) {
    await this.model.updateOne(
      {
        _id: new Types.ObjectId(remoteId),
        userId: new Types.ObjectId(userId),
        title: { $in: [null, 'New Thread'] },
      },
      { $set: { title } }
    );
  }
}
