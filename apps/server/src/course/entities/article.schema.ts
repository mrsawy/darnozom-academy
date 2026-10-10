import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class Article {
  @Prop({ type: String, required: true })
  body: string;
}

export const ArticleSchema = SchemaFactory.createForClass(Article);
