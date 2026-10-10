import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { Document, Types } from 'mongoose';

export type GalleryDocument = Gallery & Document;

@Schema({ timestamps: true })
export class Gallery {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: String, required: true })
  url: string;

  @Prop({ type: String, required: true })
  fileKey: string;

  @Prop({ type: String })
  type: string; // mime type

  @Prop({ type: String })
  title?: string; // Optional title

  @Prop({ type: Boolean, default: true })
  isPublic: boolean;
}

export const GallerySchema = SchemaFactory.createForClass(Gallery);

GallerySchema.plugin(mongoosePaginate);
