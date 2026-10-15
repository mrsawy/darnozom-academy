import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Counter } from '../entities/counter.entity';

const oid = (id: string | Types.ObjectId) =>
  Types.ObjectId.isValid(String(id)) ? new Types.ObjectId(String(id)) : (id as unknown as Types.ObjectId);

@Injectable()
export class CertificateCounterService {
  constructor(@InjectModel(Counter.name) private readonly counterModel: Model<Counter>) {}

  /**
   * Atomically increments and returns the next sequential serial number
   * for the given organization and year.
   */
  async getNextSequence(organizationId: string | Types.ObjectId, year: number | string): Promise<number> {
    const key = `certificate-${year}`;
    const result = await this.counterModel
      .findOneAndUpdate(
        { organizationId: oid(organizationId), key },
        { $inc: { sequence: 1 } },
        { new: true, upsert: true }
      )
      .exec();
    return result.sequence;
  }
}
