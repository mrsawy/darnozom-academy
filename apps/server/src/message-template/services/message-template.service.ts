import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MessageTemplateErrors, TemplateContext } from '@darnozom/shared-types';
import { MessageTemplate } from '../entities/message-template.entity';
import { validateVariables } from '../domain/template-render';
import { CreateMessageTemplateDtoServer, UpdateMessageTemplateDtoServer } from '../dto/message-template.dto';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));

@Injectable()
export class MessageTemplateService {
  constructor(
    @InjectModel(MessageTemplate.name) private readonly model: Model<MessageTemplate>,
  ) {}

  async create(organizationId: string, createdBy: string, dto: CreateMessageTemplateDtoServer): Promise<MessageTemplate> {
    const unknown = validateVariables(dto.context as TemplateContext, dto.body);
    if (unknown.length > 0) {
      throw new BadRequestException(`${MessageTemplateErrors.UNKNOWN_TEMPLATE_VARIABLE}: ${unknown.join(', ')}`);
    }
    const existing = await this.model.findOne({ organizationId: oid(organizationId), name: dto.name, deletedAt: null });
    if (existing) throw new ConflictException(MessageTemplateErrors.TEMPLATE_NAME_TAKEN);
    return this.model.create({
      organizationId: oid(organizationId),
      name: dto.name,
      context: dto.context,
      body: dto.body,
      createdBy: oid(createdBy),
    });
  }

  async findAll(organizationId: string): Promise<MessageTemplate[]> {
    return this.model.find({ organizationId: oid(organizationId), deletedAt: null }).sort({ name: 1 }).exec();
  }

  async findOne(organizationId: string, id: string): Promise<MessageTemplate> {
    const t = await this.model.findOne({ _id: oid(id), organizationId: oid(organizationId), deletedAt: null });
    if (!t) throw new NotFoundException(MessageTemplateErrors.TEMPLATE_NOT_FOUND);
    return t;
  }

  async update(organizationId: string, id: string, dto: UpdateMessageTemplateDtoServer): Promise<MessageTemplate> {
    const t = await this.findOne(organizationId, id);
    if (dto.name !== undefined && dto.name !== t.name) {
      const conflict = await this.model.findOne({
        organizationId: oid(organizationId),
        name: dto.name,
        deletedAt: null,
        _id: { $ne: oid(id) },
      });
      if (conflict) throw new ConflictException(MessageTemplateErrors.TEMPLATE_NAME_TAKEN);
      t.name = dto.name;
    }
    if (dto.body !== undefined) {
      const unknown = validateVariables(t.context, dto.body);
      if (unknown.length > 0) {
        throw new BadRequestException(`${MessageTemplateErrors.UNKNOWN_TEMPLATE_VARIABLE}: ${unknown.join(', ')}`);
      }
      t.body = dto.body;
    }
    return t.save();
  }

  async remove(organizationId: string, id: string): Promise<void> {
    const t = await this.model.findOne({ _id: oid(id), organizationId: oid(organizationId), deletedAt: null });
    if (!t) throw new NotFoundException(MessageTemplateErrors.TEMPLATE_NOT_FOUND);
    t.deletedAt = new Date();
    await t.save();
  }
}
