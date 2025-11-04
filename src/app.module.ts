import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { PostModule } from './post/post.module';
import { AuthModule } from './auth/auth.module';
import { PubSubModule } from './pubsub/pubsub.module';
import { createServer } from 'http';
import { NestFactory } from '@nestjs/core';
import { execute, subscribe } from 'graphql';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { DateScalar } from './common/scalars/date.scalar';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),

    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/awari', {
      connectionFactory: (connection) => {
        connection.on('connected', () => console.log('MongoDB connected successfully'));
        connection.on('error', (error) => console.error('MongoDB connection error:', error));
        return connection;
      },
    }),

    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      playground: true,   
      sortSchema: true,
      path: '/graphql',
      context: ({ req }) => ({ req }),
      subscriptions: {
        'subscriptions-transport-ws': {
          path: '/graphql',
          onConnect: (connectionParams: any) => {
            return {
              req: {
                headers: {
                  authorization: connectionParams?.authorization || '',
                },
              },
            };
          },
        },
        'graphql-ws': {
          path: '/graphql',
          onConnect: (ctx: any) => {
            const { connectionParams } = ctx;
            return {
              req: {
                headers: {
                  authorization: connectionParams?.authorization || '',
                },
              },
            };
          },
        },
      },
    }),

    PubSubModule,
    AuthModule,
    PostModule,
  ],
  providers: [DateScalar],
})

export class AppModule {}