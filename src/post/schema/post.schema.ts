import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PostDocument = Post & Document;

@Schema({
  timestamps: true,
  collection: 'posts',
})
export class Post {
  @Prop({ required: true, trim: true })
  content: string;

  @Prop({ required: true, index: true })
  authorId: string;

  @Prop({ default: 0, min: 0 })
  likeCount: number;

  @Prop({ default: 0, min: 0 })
  dislikeCount: number;

  @Prop({ type: [String], default: [], index: true })
  likedBy: string[];

  @Prop({ type: [String], default: [], index: true })
  dislikedBy: string[];

  createdAt?: Date;
  updatedAt?: Date;
}

export const PostSchema = SchemaFactory.createForClass(Post);

PostSchema.index({ authorId: 1, createdAt: -1 });