import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';

@Injectable()
export class ShariaFileCleanupService {
  async onVersionClosed(_contentId: Types.ObjectId | string, _changes: Record<string, unknown>): Promise<void> {
    return;
  }
}
