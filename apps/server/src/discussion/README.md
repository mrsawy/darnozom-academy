# Discussion Module

A comprehensive discussion system for courses, modules, and content with nested replies and tree-structured data retrieval.

## Features

- **Discriminator-based entities** for Course, Module, and Content discussions
- **Nested comments** with unlimited reply depth
- **Tree-structured responses** using MongoDB `$graphLookup` aggregation
- **Like/Unlike functionality**
- **Soft deletion**
- **User-based discussion retrieval**
- **Pagination support**
- **Both HTTP and Message (NATS) controllers**

## Discussion flags (course / module / content)

- **Course:** `course.settings.discussionEnabled` (default: on).
- **Module:** `module.settings.discussionEnabled` (default: on).
- **Content:** `content.settings.discussionEnabled` (default: on).

Creating, listing, fetching one by id, updating, liking, and deleting a discussion in a scope are allowed only if **course** allows it and, for module threads, **module** allows it, and for content threads, **module and content** allow it. Replies use the same rules for the scope in the request body. If disabled, those operations return `403` with message key `DiscussionDisabled` (`CourseMessages.DISCUSSION_DISABLED`). **`getUserDiscussions`** does not re-check flags (it aggregates the user’s threads across courses; treat as a profile-style list).

**Query params:** In `GET` / list handlers, `entityId` is always the **course** id for every `DiscussionType`. Use `moduleId` and `contentId` for module and content threads.

## Entities

### Discussion (Base Entity)

- `type`: DiscussionType (course, module, content)
- `userId`: User who created the discussion
- `content`: Discussion content
- `parentId`: Reference to parent discussion (for replies)
- `likesCount`: Number of likes
- `repliesCount`: Number of replies
- `likedBy`: Array of user IDs who liked
- `isEdited`: Flag for edited discussions
- `isDeleted`: Soft delete flag
- `createdAt`, `updatedAt`: Timestamps

### CourseDiscussion

Extends Discussion with:

- `courseId`: Reference to course

### ModuleDiscussion

Extends Discussion with:

- `courseId`: Reference to course
- `moduleId`: Reference to module

### ContentDiscussion

Extends Discussion with:

- `courseId`: Reference to course
- `moduleId`: Reference to module
- `contentId`: Reference to content

## API Endpoints

### HTTP Endpoints

#### Create Discussion

```http
POST /discussion
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "course",
  "content": "Great course!",
  "courseId": "60d5ec49f1b2c8b1f8e4e1a1",
  "parentId": null  // optional, for replies
}
```

#### Get Discussions (Tree Structure)

```http
GET /discussion?type=course&entityId=60d5ec49f1b2c8b1f8e4e1a1&page=1&limit=20
Authorization: Bearer <token>
```

For module discussions:

```http
GET /discussion?type=module&entityId=<courseId>&moduleId=<moduleId>&page=1&limit=20
```

For content discussions:

```http
GET /discussion?type=content&entityId=<courseId>&moduleId=<moduleId>&contentId=<contentId>&page=1&limit=20
```

#### Get Single Discussion

```http
GET /discussion/:id
Authorization: Bearer <token>
```

#### Update Discussion

```http
PATCH /discussion/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Updated content"
}
```

#### Delete Discussion

```http
DELETE /discussion/:id
Authorization: Bearer <token>
```

#### Toggle Like

```http
POST /discussion/:id/like
Authorization: Bearer <token>
```

#### Get User's Discussions

```http
GET /discussion/user/:userId?page=1&limit=20
Authorization: Bearer <token>
```

### Message Patterns (NATS)

#### Create Discussion

```typescript
pattern: 'discussion.create'
payload: {
  createDiscussionDto: CreateDiscussionDto,
  userId: string
}
```

#### Find All Discussions

```typescript
pattern: 'discussion.findAll';
payload: GetDiscussionsDto;
```

#### Find One Discussion

```typescript
pattern: 'discussion.findOne';
payload: string; // discussionId
```

#### Update Discussion

```typescript
pattern: 'discussion.update'
payload: {
  id: string,
  updateDiscussionDto: UpdateDiscussionDto,
  userId: string
}
```

#### Remove Discussion

```typescript
pattern: 'discussion.remove'
payload: {
  id: string,
  userId: string
}
```

#### Toggle Like

```typescript
pattern: 'discussion.toggleLike'
payload: {
  id: string,
  userId: string
}
```

#### Get User Discussions

```typescript
pattern: 'discussion.getUserDiscussions'
payload: {
  userId: string,
  page?: number,
  limit?: number
}
```

## Response Format

### Tree Structure Response

```json
{
  "data": [
    {
      "_id": "60d5ec49f1b2c8b1f8e4e1a1",
      "type": "course",
      "courseId": "60d5ec49f1b2c8b1f8e4e1a2",
      "userId": "60d5ec49f1b2c8b1f8e4e1a3",
      "content": "Great course!",
      "parentId": null,
      "likesCount": 5,
      "repliesCount": 2,
      "isEdited": false,
      "isDeleted": false,
      "user": {
        "_id": "60d5ec49f1b2c8b1f8e4e1a3",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "replies": [
        {
          "_id": "60d5ec49f1b2c8b1f8e4e1a4",
          "type": "course",
          "courseId": "60d5ec49f1b2c8b1f8e4e1a2",
          "userId": "60d5ec49f1b2c8b1f8e4e1a5",
          "content": "Thanks!",
          "parentId": "60d5ec49f1b2c8b1f8e4e1a1",
          "likesCount": 2,
          "repliesCount": 1,
          "user": {
            "_id": "60d5ec49f1b2c8b1f8e4e1a5",
            "name": "Jane Smith",
            "email": "jane@example.com"
          },
          "children": [
            {
              "_id": "60d5ec49f1b2c8b1f8e4e1a6",
              "content": "Nested reply",
              "parentId": "60d5ec49f1b2c8b1f8e4e1a4",
              ...
            }
          ]
        }
      ]
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 20
}
```

## MongoDB Aggregation

The service uses MongoDB's `$graphLookup` to efficiently retrieve discussions in a tree structure:

1. **Match** root discussions (parentId = null)
2. **Sort** by creation date
3. **Paginate** results
4. **$graphLookup** to recursively fetch all replies
5. **$lookup** to populate user information
6. **Structure** replies as nested children

This approach provides:

- Efficient single-query retrieval
- Unlimited nesting depth
- Proper user population at all levels
- Optimized performance with indexes

## Indexes

The following indexes are created automatically:

- `userId` - for user-based queries
- `parentId` - for reply lookups
- `createdAt` - for sorting
- `courseId` - for course discussions
- `moduleId` - for module discussions
- `contentId` - for content discussions

## Usage Example

```typescript
// Create a course discussion
const discussion = await discussionService.create(
  {
    type: DiscussionType.COURSE,
    content: 'This is a great course!',
    courseId: '60d5ec49f1b2c8b1f8e4e1a1',
  },
  userId
);

// Reply to a discussion
const reply = await discussionService.create(
  {
    type: DiscussionType.COURSE,
    content: 'Thank you!',
    courseId: '60d5ec49f1b2c8b1f8e4e1a1',
    parentId: discussion._id,
  },
  instructorId
);

// Get all discussions with tree structure
const discussions = await discussionService.findAllWithTree({
  type: DiscussionType.COURSE,
  entityId: '60d5ec49f1b2c8b1f8e4e1a1',
  page: 1,
  limit: 20,
});

// Like a discussion
await discussionService.toggleLike(discussion._id, userId);
```

## Notes

- All deletions are soft deletes (isDeleted flag)
- Only the discussion author can update or delete their own discussions
- The tree structure supports unlimited nesting depth (maxDepth: 10 in aggregation, can be adjusted)
- Replies automatically increment the parent's `repliesCount`
- Likes are tracked per user to prevent duplicate likes
