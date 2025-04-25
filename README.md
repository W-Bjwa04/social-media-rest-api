# Social Media REST API

A Node.js-based REST API for a social media platform, featuring user authentication, profile management, posts, comments with replies, stories, conversations, messages, and user search. Built with Express, MongoDB, Mongoose, and JWT for secure authentication.

## Features

- **User Management**: Register, login, update profiles, follow/unfollow, block/unblock users.
- **Posts**: Create, update, delete, and like posts with media support.
- **Comments**: Add comments to posts with nested replies, like/unlike comments and replies.
- **Stories**: Share temporary stories, like/unlike stories, view stories, and track story viewers.
- **Conversations & Messages**: Start conversations, send messages, mark messages as read, and delete conversations.
- **Search**: Find users by username, full name, or email with case-insensitive regex.
- **Authentication**: Secure JWT-based authentication with cookie-based sessions.
- **Data Integrity**: Cascading deletion of user data (posts, comments, replies, likes, conversations).
- **MongoDB Transactions**: Ensures atomic operations for critical actions.

## Tech Stack

- **Backend**: Node.js, Express
- **Database**: MongoDB with Mongoose
- **Authentication**: JSON Web Tokens (JWT), cookie-parser
- **Error Handling**: Custom middleware for consistent error responses
- **Environment**: dotenv for configuration
- **File Uploads**: Multer for handling media uploads, Cloudinary for storage
- **Formatting**: Prettier for code consistency

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (v5 or higher, configured as a replica set for transactions)
- Git

## Installation

1. **Clone the Repository**:

   git clone https://github.com/w-bjwa04/social-media-rest-api.git
   cd social-media-rest-api

2. **Install Dependencies**:

   npm install

3. **Set Up Environment Variables**: Create a `.env` file in the root directory:

   MONGODB_URI=mongodb://localhost:27017/socialMediaDB?replicaSet=rs0
   JWT_SECRET=your_jwt_secret
   NODE_ENV=development
   PORT=5000
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret

4. **Run MongoDB**: Start MongoDB with a replica set:

   mongod --replSet rs0 --dbpath /path/to/db --port 27017

   Initialize the replica set:

   mongosh
   rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: 'localhost:27017' }] })

5. **Start the Server**:

   npm start

   The API will be available at `http://localhost:5000`.

## API Endpoints

### Authentication

- **Register**: `POST /register`

  - Body: `{ "username": "john_doe", "email": "john@example.com", "password": "pass123" }`
  - Response: `{ "message": "User registered successfully" }`

- **Login**: `POST /login`

  - Body: `{ "username": "john_doe", "password": "pass123" }`
  - Response: Sets `token` cookie and returns `{ "message": "Login successful" }`

### User Management

- **Get User**: `GET /users/:userid`

  - Headers: `Cookie: token=your-jwt-token`
  - Response: `{ "user": { "_id": "507f1f77bcf86cd799439011", "username": "john_doe", ... } }`

- **Search Users**: `GET /users/search?q=john`

  - Headers: `Cookie: token=your-jwt-token`
  - Response: `{ "users": [{ "_id": "507f1f77bcf86cd799439011", "username": "john_doe", "fullName": "John Doe" }, ...] }`

- **Update User Profile**: `PUT /users/update/:userid`

  - Headers: `Cookie: token=your-jwt-token`
  - Body: `{ "fullName": "John Updated", "profilePicture": "new_picture_url" }`
  - Response: `{ "message": "Profile updated successfully", "user": { ... } }`

- **Follow User**: `POST /users/follow/:userid`

  - Headers: `Cookie: token=your-jwt-token`
  - Response: `{ "message": "User followed successfully" }`

- **Unfollow User**: `POST /users/unfollow/:userid`

  - Headers: `Cookie: token=your-jwt-token`
  - Response: `{ "message": "User unfollowed successfully" }`

- **Block User**: `POST /users/block/:userid`

  - Headers: `Cookie: token=your-jwt-token`
  - Response: `{ "message": "User blocked successfully" }`

- **Unblock User**: `POST /users/unblock/:userid`

  - Headers: `Cookie: token=your-jwt-token`
  - Response: `{ "message": "User unblocked successfully" }`

- **Delete User**: `DELETE /users/:userid`

  - Headers: `Cookie: token=your-jwt-token`
  - Response: `{ "message": "User and related data deleted successfully" }`

### Posts

- **Create Post**: `POST /posts`

  - Headers: `Cookie: token=your-jwt-token`
  - Body: Form-data `{ "caption": "Hello world!", "images": [uploaded_files] }`
  - Response: `{ "message": "Post created successfully", "post": { ... } }`

- **Update Post**: `PUT /posts/update/:postid`

  - Headers: `Cookie: token=your-jwt-token`
  - Body: Form-data `{ "caption": "Updated caption", "deleteImages": "public_id1,public_id2", "images": [new_uploaded_files] }`
  - Response: `{ "message": "Post updated successfully", "post": { ... } }`

- **Delete Post**: `DELETE /posts/delete/:postid`

  - Headers: `Cookie: token=your-jwt-token`
  - Response: `{ "message": "Post deleted successfully" }`

- **Like Post**: `POST /posts/like/:postid`

  - Headers: `Cookie: token=your-jwt-token`
  - Response: `{ "message": "Post liked successfully", "post": { ... } }`

- **Unlike Post**: `POST /posts/unlike/:postid`

  - Headers: `Cookie: token=your-jwt-token`
  - Response: `{ "message": "Post unliked successfully", "post": { ... } }`

### Comments

- **Add Comment**: `POST /comments`

  - Headers: `Cookie: token=your-jwt-token`
  - Body: `{ "post": "postId", "text": "Nice post!" }`
  - Response: `{ "message": "Comment added successfully", "comment": { ... } }`

- **Add Reply**: `POST /comments/:commentid/replies`

  - Headers: `Cookie: token=your-jwt-token`
  - Body: `{ "text": "Thanks!" }`
  - Response: `{ "message": "Reply added successfully", "comment": { ... } }`

- **Like Comment**: `POST /comments/like/:commentid`

  - Headers: `Cookie: token=your-jwt-token`
  - Response: `{ "message": "Comment liked successfully", "comment": { ... } }`

- **Unlike Comment**: `POST /comments/unlike/:commentid`

  - Headers: `Cookie: token=your-jwt-token`
  - Response: `{ "message": "Comment unliked successfully", "comment": { ... } }`

- **Like Reply**: `POST /comments/:commentid/replies/:replyid/like`

  - Headers: `Cookie: token=your-jwt-token`
  - Response: `{ "message": "Comment reply liked successfully", "reply": { ... } }`

- **Unlike Reply**: `POST /comments/:commentid/replies/:replyid/unlike`

  - Headers: `Cookie: token=your-jwt-token`
  - Response: `{ "message": "Comment reply unliked successfully", "reply": { ... } }`

### Stories

- **Create Story**: `POST /stories/create/:userid`

  - Headers: `Cookie: token=your-jwt-token`
  - Body: Form-data `{ "text": "My story!", "images": [uploaded_files] }`
  - Response: `{ "message": "Story created successfully", "story": { ... } }`

- **Get Story by ID**: `GET /stories/:storyid`

  - Headers: `Cookie: token=your-jwt-token`
  - Response: `{ "message": "Story fetched successfully", "story": { ... } }`

- **Get User Stories**: `GET /stories/user/:userid`

  - Headers: `Cookie: token=your-jwt-token`
  - Response: `{ "message": "Stories fetched successfully", "story": [...] }`

- **Update Story**: `PUT /stories/update/:storyid`

  - Headers: `Cookie: token=your-jwt-token`
  - Body: Form-data `{ "text": "Updated story", "deleteImages": "public_id1", "images": [new_uploaded_files] }`
  - Response: `{ "message": "Story updated successfully", "story": { ... } }`

- **Delete Story**: `DELETE /stories/delete/:storyid`

  - Headers: `Cookie: token=your-jwt-token`
  - Response: `{ "message": "Story deleted successfully" }`

- **Like Story**: `POST /stories/like/:storyid`

  - Headers: `Cookie: token=your-jwt-token`
  - Response: `{ "message": "Story liked successfully", "story": { ... } }`

- **Unlike Story**: `POST /stories/unlike/:storyid`

  - Headers: `Cookie: token=your-jwt-token`
  - Response: `{ "message": "Story unliked successfully", "story": { ... } }`

### Conversations & Messages

- **Start Conversation**: `POST /conversations/start`

  - Headers: `Cookie: token=your-jwt-token`
  - Body: `{ "participantId": "userId" }`
  - Response: `{ "message": "Conversation started successfully", "conversation": { ... } }`

- **Get User Conversations**: `GET /conversations`

  - Headers: `Cookie: token=your-jwt-token`
  - Response: `{ "message": "Conversations fetched successfully", "conversations": [...] }`

- **Get Conversation**: `GET /conversations/:conversationId`

  - Headers: `Cookie: token=your-jwt-token`
  - Response: `{ "message": "Conversation fetched successfully", "conversation": { ... }, "messages": [...] }`

- **Send Message**: `POST /conversations/:conversationId/message`

  - Headers: `Cookie: token=your-jwt-token`
  - Body: `{ "content": "Hello!" }`
  - Response: `{ "message": "Message sent successfully", "message": { ... } }`

- **Mark Message as Read**: `POST /conversations/message/:messageId/read`

  - Headers: `Cookie: token=your-jwt-token`
  - Response: `{ "message": "Message marked as read successfully" }`

- **Delete Conversation**: `DELETE /conversations/:conversationId`

  - Headers: `Cookie: token=your-jwt-token`
  - Response: `{ "message": "Conversation deleted successfully" }`

## Authentication

- Uses JWT stored in an HTTP-only cookie (`token`).
- Protected routes require the `token` cookie, verified by the `verifyToken` middleware.
- Example:

   curl -X GET http://localhost:5000/users/507f1f77bcf86cd799439011 \
   -H "Cookie: token=your-jwt-token"

## Project Structure

social-media-rest-api/
├── config/
│   └── cloudinary.js
├── controllers/
│   ├── userController.js
│   ├── postController.js
│   ├── commentController.js
│   ├── storyController.js
│   └── conversationController.js
├── middlewares/
│   ├── error.middlewares.js
│   ├── verifyToken.js
│   └── upload.js
├── models/
│   ├── User.js
│   ├── Post.js
│   ├── Comment.js
│   ├── Story.js
│   ├── Conversation.js
│   └── Message.js
├── routes/
│   ├── auth.routes.js
│   ├── user.routes.js
│   ├── post.routes.js
│   ├── comment.routes.js
│   ├── story.routes.js
│   └── conversation.routes.js
├── .env
├── app.js
├── package.json
└── README.md

## Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/your-feature`.
3. Commit changes: `git commit -m 'Add your feature'`.
4. Push to the branch: `git push origin feature/your-feature`.
5. Open a pull request.

## License

MIT License

## Contact

For issues or suggestions, open a GitHub issue or contact waleedshahid123ml@gmail.com