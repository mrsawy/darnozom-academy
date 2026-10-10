import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Plan } from './entities/plan.entity';
import mongoose, { Model } from 'mongoose';
import { BillingCycle } from 'src/utils/enums/billingCycle.enum';
import { Frequency } from 'src/utils/types/Frequency.enum';
import { Currency } from '@lms-organization/shared-types';

@Injectable()
export class PlanService {
  constructor(@InjectModel(Plan.name) private readonly planModel: Model<Plan>) {}

  /** Returns price and currency for a plan for the given frequency (30 = monthly, 365 = yearly). */
  getPlanPricing(plan: Plan, frequency: number, userCurrency?: Currency): { price: number; currency: Currency } {
    const cycle = frequency === Number(Frequency.MONTHLY) ? BillingCycle.MONTHLY : BillingCycle.YEARLY;
    const pricing = plan.price?.[cycle];
    if (!pricing) return { price: 0, currency: Currency.USD };
    if (userCurrency && userCurrency === pricing.originalCurrency) {
      return { price: pricing.originalPrice, currency: pricing.originalCurrency };
    }
    return { price: pricing.priceUSD, currency: Currency.USD };
  }

  // Create a new plan
  async create(createPlanDto: CreatePlanDto) {
    const createdPlan = await this.planModel.create(createPlanDto);
    return createdPlan;
  }

  // Find all plans
  async findAll() {
    return this.planModel.find().exec();
  }

  // Find one plan by ID
  async findOne(identifier: string) {
    const filter = mongoose.isValidObjectId(identifier) ? { _id: identifier } : { $or: [{ tier: identifier }, { name: identifier }] };
    const plan = await this.planModel.findOne(filter).exec();
    if (!plan) {
      throw new NotFoundException(`Plan with ID ${identifier} not found`);
    }
    return plan;
  }

  // Update a plan
  async update(id: string, updatePlanDto: UpdatePlanDto) {
    const updatedPlan = await this.planModel.findByIdAndUpdate(id, updatePlanDto, { new: true, runValidators: true }).exec();

    if (!updatedPlan) {
      throw new NotFoundException(`Plan with ID ${id} not found`);
    }

    return updatedPlan;
  }

  // Remove (soft delete or hard delete)
  async remove(id: string) {
    const deletedPlan = await this.planModel.findByIdAndDelete(id).exec();
    if (!deletedPlan) {
      throw new NotFoundException(`Plan with ID ${id} not found`);
    }
    return { message: `Plan with ID ${id} deleted successfully` };
  }
}
