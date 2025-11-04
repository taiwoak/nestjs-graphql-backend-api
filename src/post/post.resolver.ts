import { Resolver, Query, Mutation, Args, Subscription, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { PostService } from './post.service';
import { PubSubService } from '../pubsub/pubsub.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { UserPayload } from '../common/interfaces/auth-context.interface';
import { PostDto } from './dto/post.dto';
import { PostUpdateDto } from './dto/post-update.dto';
import { CreatePostInput } from './dto/create-post.input';

@Resolver(() => PostDto)
export class PostResolver {
  constructor(
    private postService: PostService,
    private pubSubService: PubSubService,
  ) {}

  @Query(() => PostDto, {
    name: 'post',
    description: 'Get a post by ID with like/dislike counts and user interaction state',
  })
  @UseGuards(AuthGuard)
  async getPost(
    @Args('postId', { type: () => ID }) postId: string,
    @CurrentUser() user: UserPayload,
  ): Promise<PostDto> {
    return this.postService.getPost(postId, user.userId);
  }

  @Mutation(() => PostDto, {
    name: 'createPost',
    description: 'Create a new post',
  })
  @UseGuards(AuthGuard)
  async createPost(
    @Args('input') input: CreatePostInput,
    @CurrentUser() user: UserPayload,
  ): Promise<PostDto> {
    return this.postService.createPost(input, user.userId);
  }

  @Mutation(() => PostDto, {
    name: 'likePost',
    description: 'Like a post (or unlike if already liked). Removes dislike if present.',
  })
  @UseGuards(AuthGuard)
  async likePost(
    @Args('postId', { type: () => ID }) postId: string,
    @CurrentUser() user: UserPayload,
  ): Promise<PostDto> {
    return this.postService.likePost(postId, user.userId);
  }

  @Mutation(() => PostDto, {
    name: 'dislikePost',
    description: 'Dislike a post (or undislike if already disliked). Removes like if present.',
  })
  @UseGuards(AuthGuard)
  async dislikePost(
    @Args('postId', { type: () => ID }) postId: string,
    @CurrentUser() user: UserPayload,
  ): Promise<PostDto> {
    return this.postService.dislikePost(postId, user.userId);
  }

  @Subscription(() => PostUpdateDto, {
    name: 'onPostUpdate',
    description: 'Subscribe to real-time like/dislike count updates for a post',
    resolve: (payload) => payload.onPostUpdate,
  })
  onPostUpdate(
    @Args('postId', { type: () => ID }) postId: string,
  ): AsyncIterator<PostUpdateDto> {
    const trigger = PubSubService.getPostUpdateTrigger(postId);
    return this.pubSubService.asyncIterator<PostUpdateDto>(trigger);
  }
}