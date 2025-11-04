import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

@InputType()
export class CreatePostInput {
  @Field()
  @IsNotEmpty({ message: 'Post content cannot be empty' })
  @IsString()
  @MaxLength(5000, { message: 'Post content cannot exceed 5000 characters' })
  content: string;
}