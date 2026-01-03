# NestJS GraphQL Backend API

This is a **NestJS GraphQL API** that implements real-time post updates using **MongoDB**, **Redis Pub/Sub**, and **GraphQL Subscriptions**.  
It supports creating posts, liking/disliking posts, and streaming live updates to connected clients via WebSockets.  
The project demonstrates backend architecture, schema design, real-time communication, Dockerized setup, and GCP deployment readiness.

---

## 1.1 Setup & Execution

### Prerequisites

Ensure the following software is installed on your system:

| Tool               | Minimum Version | Purpose                                   |
| ------------------ | --------------- | ----------------------------------------- |
| **Node.js**        | ≥ 18.x          | For local builds and tests                |
| **Docker**         | ≥ 24.x          | To run API, MongoDB, and Redis containers |
| **Docker Compose** | ≥ 2.x           | To orchestrate multi-container setup      |
| **Git**            | ≥ 2.30          | For cloning and version control           |

---

### Local Run Command

To build and start **all services (NestJS API, MongoDB, Redis)** locally, run:

```bash
docker compose up --build
```

This command:
- Builds the NestJS application container (`nestjs-api`)
- Starts **MongoDB** (`nestjs-mongo`) and **Redis** (`nestjs-redis`)
- Exposes the GraphQL API at port **3000**

---

### API Endpoint

Once started, open the **GraphQL Playground** at: **http://localhost:3000/graphql**

Here you can run all queries, mutations, and subscriptions.

---

## 1.2  Design Decisions

### Data Model: MongoDB Schema Design

#### Post Schema
```ts
@Schema({ timestamps: true })
export class Post {
  @Prop({ required: true })
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
}
```

#### Embedding vs. Referencing Justification
- **Referencing (used here)**: Each post keeps an array of user IDs (`likedBy`, `dislikedBy`) referencing users.  
  This ensures:
  - Fast and scalable lookups when counting likes/dislikes.
  - Prevents large embedded user data from bloating each post document.
  - Supports easy aggregation and pagination if user relationships grow.
- **Embedding (not used)**: Embedding entire user objects (name, etc.) in posts would increase document size and duplicate user data across multiple posts, leading to performance degradation.

**Conclusion:** Referencing user IDs is more scalable and efficient for a social-like interaction model.

---

### Real-Time Flow

#### Like/Dislike Operation Flow
1. A user performs the `likePost(postId)` mutation.
2. The `PostService` updates the MongoDB document — incrementing the like count and user references.
3. Immediately after the update, the service **publishes an event** to Redis using `PubSubService.publish()`.
4. Redis propagates this event to all connected GraphQL servers (horizontal scalability ready).
5. All clients subscribed to `onPostUpdate(postId)` receive an instant notification via WebSocket.

**Sequence:**  
`Mutation → MongoDB Update → Redis PubSub → WebSocket Broadcast → Subscribed Clients`

---

### Security / Authentication Mock

A mock authentication system is implemented for this assessment (no real JWT validation).

Static mock users:
```ts
export const MOCK_USERS = {
  'token-user-1': { userId: 'user-1', username: 'Taiwo' },
  'token-user-2': { userId: 'user-2', username: 'Daniel' },
  'token-user-3': { userId: 'user-3', username: 'Akerele' },
};
```

To authenticate, include this header in GraphQL Playground or Postman:
```
Authorization: Bearer token-user-1
```

The `AuthGuard` validates this header and attaches the mock user as the current user in context:
```ts
context: ({ req }) => ({ req, user: MOCK_USERS[req.headers.authorization] })
```

This satisfies the “mock authentication layer” requirement — no login flow or real tokens are needed.

---

## 1.3 Testing & Verification

### Test Case 1: Mutation — Like a Post

#### Example GraphQL Mutation
```graphql
mutation likePost($postId: ID!) {
  likePost(postId: $postId) {
    id
    likeCount
    dislikeCount
    isLikedByCurrentUser
  }
}
```

#### Variables

```json
{
  "postId": "YOUR_POST_ID"
}
```

#### HTTP Headers

```json
{
  "Authorization": "Bearer token-user-1"
}
```

#### Expected Behavior
- Increments the post’s `likeCount`.
- Adds the current user ID to `likedBy`.
- Publishes an update event to Redis.
- Returns updated post data with current user's interaction state.

---

### Test Case 2: Subscription — Listen for Post Updates

#### GraphQL Subscription
```graphql
subscription OnPostUpdate($postId: ID!) {
  onPostUpdate(postId: $postId) {
    postId
    likeCount
    dislikeCount
    timestamp
  }
}
```

#### Variables
```json
{
  "postId": "YOUR_POST_ID"
}
```

#### Expected Behavior
- Immediately receives new counts (`likeCount`, `dislikeCount`, and `timestamp`) when any user likes/dislikes the post.
- Updates happen in real-time without page refresh.

---

### Test Scenario Instructions

1. **Open two tabs** of GraphQL Playground at `http://localhost:3000/graphql`:
   - **Tab 1:** Run the **subscription** query below (listening to a specific postId).
   - **Tab 2:** Run the **likePost** mutation with the same postId.

   **Tab 1 (Subscriber):**
   - Set HTTP Headers:
     ```json
     {
       "Authorization": "Bearer token-user-1"
     }
     ```
   - Run the **subscription** query:
     ```graphql
     subscription {
       onPostUpdate(postId: "YOUR_POST_ID") {
         postId
         likeCount
         dislikeCount
         timestamp
       }
     }
     ```

   **Tab 2 (Actor):**
   - Set HTTP Headers with a different user:
     ```json
     {
       "Authorization": "Bearer token-user-2"
     }
     ```
   - Run the **likePost** mutation:
     ```graphql
     mutation {
       likePost(postId: "YOUR_POST_ID") {
         id
         likeCount
         dislikeCount
         isLikedByCurrentUser
       }
     }
     ```

2. **Observe:**  
   - The update in Tab 1 is instant — it displays new like/dislike counts and timestamp without refresh.
   - This demonstrates real-time WebSocket communication through Redis PubSub.

3. **You can test multiple users** by changing the header:
   ```json
   {
     "Authorization": "Bearer token-user-3"
   }
   ```

---

### Complete Test Flow

#### A. Create a Post First

```graphql
mutation {
  createPost(input: { content: "Testing real-time likes!" }) {
    id
    content
    likeCount
    dislikeCount
    authorId
  }
}
```

**Copy the returned `id` for use in subsequent tests.**

#### B. Query the Post

```graphql
query {
  post(postId: "YOUR_POST_ID") {
    id
    content
    likeCount
    dislikeCount
    isLikedByCurrentUser
    isDislikedByCurrentUser
    createdAt
    authorId
  }
}
```

#### C. Like the Post

```graphql
mutation {
  likePost(postId: "YOUR_POST_ID") {
    id
    likeCount
    dislikeCount
    isLikedByCurrentUser
  }
}
```

#### D. Toggle (Unlike) by running the same mutation again

```graphql
mutation {
  likePost(postId: "YOUR_POST_ID") {
    id
    likeCount
    dislikeCount
    isLikedByCurrentUser
  }
}
```

**Result:** `likeCount` decreases, `isLikedByCurrentUser` becomes `false`.

#### E. Test Conflict Resolution (Like → Dislike)

```graphql
# First, like the post
mutation {
  likePost(postId: "YOUR_POST_ID") {
    id
    likeCount
    dislikeCount
    isLikedByCurrentUser
    isDislikedByCurrentUser
  }
}

# Then, dislike the same post
mutation {
  dislikePost(postId: "YOUR_POST_ID") {
    id
    likeCount
    dislikeCount
    isLikedByCurrentUser
    isDislikedByCurrentUser
  }
}
```

**Result:** 
- Like is automatically removed
- Dislike is added
- User cannot have both like AND dislike simultaneously

---

## Infrastructure Overview

| Component                   | Role                                            |
| --------------------------- | ----------------------------------------------- |
| **NestJS (API)**            | GraphQL server and business logic               |
| **MongoDB**                 | Data persistence for posts                      |
| **Redis**                   | Pub/Sub messaging for subscription events       |
| **graphql-ws**              | WebSocket transport for GraphQL Subscriptions   |
| **Docker Compose**          | Orchestration of all services for local testing |
| **Cloud Run + Cloud Build** | Optional GCP deployment pipeline                |

---

## Single Command Summary

To build and run the complete stack locally:
```bash
docker compose up --build
```

---

## Technology Stack Summary

| Category               | Technology                    |
| ---------------------- | ----------------------------- |
| **Framework**          | NestJS + Apollo Server 3      |
| **Database**           | MongoDB (Mongoose ODM)        |
| **Cache/Events**       | Redis Pub/Sub                 |
| **Realtime Transport** | WebSocket (graphql-ws)        |
| **Authentication**     | Mock static tokens            |
| **Deployment Ready**   | Cloud Run + Cloud Build (GCP) |
| **Local Startup**      | `docker compose up --build`   |

---

## Environment Variables

Create a `.env` file in the root directory:

```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/awari
REDIS_HOST=localhost
REDIS_PORT=6379
```

For Docker Compose, these are configured in `docker-compose.yml`.

---

## Key Features Implemented

- **GraphQL API** with queries, mutations, and subscriptions
- **Real-time updates** via Redis PubSub and WebSocket
- **Like/Dislike functionality** with toggle behavior
- **Conflict resolution** (user can't like AND dislike)
- **Atomic operations** to prevent race conditions
- **Mock authentication** with multiple test users
- **Docker containerization** for easy deployment
- **GCP Cloud Run ready** for production deployment
- **Scalable architecture** with horizontal scaling support

---

## Support

For questions or issues during review:
- **GraphQL Playground**: `http://localhost:3000/graphql`
- **Health Check**: `http://localhost:3000/health`
- **Logs**: `docker compose logs -f api`

---

## Single Command Summary

To build and run the complete stack locally:

```bash
docker compose up --build
```

Then open **http://localhost:3000/graphql** and start testing with the mock tokens:
- `Bearer token-user-1` (Taiwo)
- `Bearer token-user-2` (Daniel)
- `Bearer token-user-3` (Akerele)

---

**Project Built By**: Taiwo Akerele

**Stack**: NestJS • GraphQL • MongoDB • Redis • Docker • GCP
