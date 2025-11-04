import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Post, PostSchema } from './schema/post.schema';
import { PostService } from './post.service';
import { PostResolver } from './post.resolver';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Post.name,
        schema: PostSchema,
      },
    ]),
    AuthModule,
  ],
  providers: [PostService, PostResolver],
  exports: [PostService],
})
export class PostModule {}