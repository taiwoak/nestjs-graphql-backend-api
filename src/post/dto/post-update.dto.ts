import { Field, ObjectType, ID } from '@nestjs/graphql';

@ObjectType()
export class PostUpdateDto {
  @Field(() => ID)
  postId: string;

  @Field()
  likeCount: number;

  @Field()
  dislikeCount: number;

  @Field(() => Date, { nullable: true })
  timestamp?: Date;
}