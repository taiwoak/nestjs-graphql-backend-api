import { Field, ObjectType, ID, Int } from '@nestjs/graphql';

@ObjectType()
export class PostDto {
  @Field(() => ID)
  id: string;

  @Field()
  content: string;

  @Field()
  authorId: string;

  @Field(() => Int)
  likeCount: number;

  @Field(() => Int)
  dislikeCount: number;

  @Field()
  isLikedByCurrentUser: boolean;

  @Field()
  isDislikedByCurrentUser: boolean;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}