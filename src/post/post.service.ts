import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Post, PostDocument } from './schema/post.schema';
import { PostDto } from './dto/post.dto';
import { PostUpdateDto } from './dto/post-update.dto';
import { CreatePostInput } from './dto/create-post.input';
import { PubSubService } from '../pubsub/pubsub.service';

@Injectable()
export class PostService {
  constructor(
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
    private pubSubService: PubSubService,
  ) {}

  async createPost(input: CreatePostInput, authorId: string): Promise<PostDto> {
    const post = await this.postModel.create({
      content: input.content,
      authorId,
      likeCount: 0,
      dislikeCount: 0,
      likedBy: [],
      dislikedBy: [],
    });

    console.log(`Post created: ${post._id} by ${authorId}`);
    return this.mapToDto(post, authorId);
  }

  async getPost(postId: string, userId: string): Promise<PostDto> {
    this.validateObjectId(postId);

    const post = await this.postModel.findById(postId).exec();

    if (!post) {
      throw new NotFoundException(`Post with ID ${postId} not found`);
    }

    return this.mapToDto(post, userId);
  }

  async likePost(postId: string, userId: string): Promise<PostDto> {
    this.validateObjectId(postId);

    const post = await this.postModel.findById(postId).exec();

    if (!post) {
      throw new NotFoundException(`Post with ID ${postId} not found`);
    }

    const isAlreadyLiked = post.likedBy.includes(userId);
    const isAlreadyDisliked = post.dislikedBy.includes(userId);

    let updateOperation: any; 

    if (isAlreadyLiked) {
      // Unlike
      updateOperation = {
        $pull: { likedBy: userId },
        $inc: { likeCount: -1 },
      };
      console.log(`User ${userId} unliked post ${postId}`);
    } else {
      // Like
      updateOperation = {
        $addToSet: { likedBy: userId },
        $inc: { likeCount: 1 },
      };

      // Remove dislike if present
      if (isAlreadyDisliked) {
        updateOperation.$pull = { dislikedBy: userId };
        updateOperation.$inc.dislikeCount = -1;
      }
      console.log(`User ${userId} liked post ${postId}`);
    }

    const updatedPost = await this.postModel
      .findByIdAndUpdate(postId, updateOperation, { new: true })
      .exec();

    if (!updatedPost) {
      throw new NotFoundException(`Post update failed for ID ${postId}`);
    }

    await this.publishPostUpdate(updatedPost);

    return this.mapToDto(updatedPost, userId);
  }

  async dislikePost(postId: string, userId: string): Promise<PostDto> {
    this.validateObjectId(postId);

    const post = await this.postModel.findById(postId).exec();

    if (!post) {
      throw new NotFoundException(`Post with ID ${postId} not found`);
    }

    const isAlreadyLiked = post.likedBy.includes(userId);
    const isAlreadyDisliked = post.dislikedBy.includes(userId);

    let updateOperation: any;

    if (isAlreadyDisliked) {
      // Undislike
      updateOperation = {
        $pull: { dislikedBy: userId },
        $inc: { dislikeCount: -1 },
      };
      console.log(`User ${userId} removed dislike from post ${postId}`);
    } else {
      // Dislike
      updateOperation = {
        $addToSet: { dislikedBy: userId },
        $inc: { dislikeCount: 1 },
      };

      // Remove like if present
      if (isAlreadyLiked) {
        updateOperation.$pull = { likedBy: userId };
        updateOperation.$inc.likeCount = -1;
      }
      console.log(`User ${userId} disliked post ${postId}`);
    }

    const updatedPost = await this.postModel
      .findByIdAndUpdate(postId, updateOperation, { new: true })
      .exec();

    if (!updatedPost) {
      throw new NotFoundException(`Post update failed for ID ${postId}`);
    }

    await this.publishPostUpdate(updatedPost);

    return this.mapToDto(updatedPost, userId);
  }

  private async publishPostUpdate(post: PostDocument): Promise<void> {
    const trigger = PubSubService.getPostUpdateTrigger(String(post._id));
    const payload: PostUpdateDto = {
      postId: String(post._id),
      likeCount: post.likeCount,
      dislikeCount: post.dislikeCount,
      timestamp: new Date(),
    };

    await this.pubSubService.publish(trigger, { onPostUpdate: payload });
  }

  private mapToDto(post: PostDocument, userId: string): PostDto {
    return {
      id: String(post._id),
      content: post.content,
      authorId: post.authorId,
      likeCount: post.likeCount,
      dislikeCount: post.dislikeCount,
      isLikedByCurrentUser: post.likedBy.includes(userId),
      isDislikedByCurrentUser: post.dislikedBy.includes(userId),
      createdAt: post.createdAt ?? new Date(),
      updatedAt: post.updatedAt ?? new Date(),
    };
  }

  private validateObjectId(id: string): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ObjectId format: ${id}`);
    }
  }
}