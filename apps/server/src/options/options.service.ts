import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { CreateOptionDto } from './dto/create-option.dto';
import { UpdateOptionDto } from './dto/update-option.dto';
import { Option } from './entities/option.entity';

@Injectable()
export class OptionsService {
  constructor(@InjectModel(Option.name) private readonly optionModel: Model<Option>) {}

  async create(createOptionDto: CreateOptionDto): Promise<Option> {
    const foundedOption = await this.optionModel.findOne({ key: createOptionDto.key });
    if (foundedOption) throw new BadRequestException('Option with this key already exists');
    const option = new this.optionModel(createOptionDto);
    return option.save();
  }

  async findAll(): Promise<Option[]> {
    return this.optionModel.find().exec();
  }

  async findPlatformOptions(): Promise<Option[]> {
    return this.optionModel.find({ organizationId: null }).exec();
  }

  async findOne(identifier: string): Promise<Option> {
    let option: Option | null = null;
    if (mongoose.Types.ObjectId.isValid(identifier)) {
      option = await this.optionModel.findById(identifier).exec();
      if (option) return option;
    }
    option = await this.optionModel.findOne({ key: identifier }).exec();
    if (!option) {
      throw new NotFoundException(`Option with identifier "${identifier}" not found`);
    }
    return option;
  }

  async upsert(key: string, value: unknown, organizationId?: string): Promise<Option> {
    const filter: Record<string, unknown> = { key, organizationId: organizationId ?? null };
    const update = { key, value, organizationId: organizationId ?? null };
    const option = await this.optionModel.findOneAndUpdate(filter, update, { new: true, upsert: true, setDefaultsOnInsert: true }).exec();
    return option;
  }

  async update(id: string, updateOptionDto: UpdateOptionDto): Promise<Option> {
    const updatedOption = await this.optionModel.findByIdAndUpdate(id, updateOptionDto, { new: true }).exec();
    if (!updatedOption) {
      throw new NotFoundException(`Option with ID "${id}" not found`);
    }
    return updatedOption;
  }

  async remove(id: string): Promise<void> {
    const result = await this.optionModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Option with ID "${id}" not found`);
    }
  }
}
