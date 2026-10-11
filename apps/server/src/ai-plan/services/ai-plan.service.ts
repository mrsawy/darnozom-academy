import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AiPlan, AiPlanDocument } from '../entities/ai-plan.entity';
import { AiPlanTier } from '@darnozom/shared-types';

@Injectable()
export class AiPlanService {
  constructor(@InjectModel(AiPlan.name) private readonly aiPlanModel: Model<AiPlanDocument>) {}

  async findAll(): Promise<AiPlanDocument[]> {
    return (await this.aiPlanModel.find().lean().exec()) as unknown as AiPlanDocument[];
  }

  /** Returns only active plans — used by the public pricing page (no auth). */
  async findAllPublic(): Promise<AiPlanDocument[]> {
    return (await this.aiPlanModel.find({ isActive: true }).lean().exec()) as unknown as AiPlanDocument[];
  }

  async findOne(id: string): Promise<AiPlanDocument> {
    const plan = (await this.aiPlanModel.findById(id).lean().exec()) as unknown as AiPlanDocument;
    if (!plan) throw new NotFoundException(`AiPlan with id ${id} not found`);
    return plan;
  }

  async findByTier(tier: AiPlanTier): Promise<AiPlanDocument | null> {
    return (await this.aiPlanModel.findOne({ tier }).lean().exec()) as unknown as AiPlanDocument | null;
  }

  async create(data: Partial<AiPlan>): Promise<AiPlanDocument> {
    const plan = new this.aiPlanModel(data);
    return (await plan.save()) as unknown as AiPlanDocument;
  }

  async update(id: string, data: Partial<AiPlan>): Promise<AiPlanDocument> {
    const updated = (await this.aiPlanModel.findByIdAndUpdate(id, { $set: data }, { new: true }).lean().exec()) as unknown as AiPlanDocument;
    if (!updated) throw new NotFoundException(`AiPlan with id ${id} not found`);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const result = await this.aiPlanModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException(`AiPlan with id ${id} not found`);
  }
}
