# Social Media REST API

A Node.js-based REST API for a social media platform, featuring user authentication, profile management, posts, comments with replies, stories, and user search. Built with Express, MongoDB, Mongoose, and JWT for secure authentication.

## Features

- **User Management**: Register, login, update profiles, follow/unfollow, block/unblock users.
- **Posts**: Create, delete, and like posts with media support.
- **Comments**: Add comments to posts with nested replies.
- **Stories**: Share temporary stories.
- **Search**: Find users by username, full name, or email with case-insensitive regex.
- **Authentication**: Secure JWT-based authentication with cookie-based sessions.
- **Data Integrity**: Cascading deletion of user data (posts, comments, replies, likes).
- **MongoDB Transactions**: Ensures atomic operations for critical actions.

## Tech Stack

- **Backend**: Node.js, Express
- **Database**: MongoDB with Mongoose
- **Authentication**: JSON Web Tokens (JWT), cookie-parser
- **Error Handling**: Custom middleware for consistent error responses
- **Environment**: dotenv for configuration
- **Formatting**: Prettier for code consistency

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (v5 or higher, configured as a replica set for transactions)
- Git

## Installation

1. **Clone the Repository**:

   ```bash
   git clone https://github.com/your-username/social-media-rest-api.git
   cd social-media-rest-api
   ```

2. **Install Dependencies**:

   ```bash
   npm install
   ```

3. **Set Up Environment Variables**: Create a `.env` file in the root directory:

   ```env
   MONGODB_URI=mongodb://localhost:27017/socialMediaDB?replicaSet=rs0
   JWT_SECRET=your_jwt_secret
   NODE_ENV=development
   PORT=5000
   ```

4. **Run MongoDB**: Start MongoDB with a replica set:

   ```bash
   mongod --replSet rs0 --dbpath /path/to/db --port 27017
   ```

   Initialize the replica set:

   ```bash
   mongosh
   rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: 'localhost:27017' }] })
   ```

5. **Start the Server**:

   ```bash
   npm start
   ```

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

- **Delete User**: `DELETE /users/:userid`

  - Headers: `Cookie: token=your-jwt-token`
  - Response: `{ "message": "User and related data deleted successfully" }`

### Posts

- **Create Post**: `POST /posts`
  - Headers: `Cookie: token=your-jwt-token`
  - Body: `{ "content": "Hello world!" }`
  - Response: `{ "message": "Post created successfully" }`

### Comments

- **Add Comment**: `POST /comments`

  - Headers: `Cookie: token=your-jwt-token`
  - Body: `{ "post": "postId", "text": "Nice post!" }`
  - Response: `{ "message": "Comment added" }`

- **Add Reply**: `POST /comments/:commentId/replies`

  - Headers: `Cookie: token=your-jwt-token`
  - Body: `{ "text": "Thanks!" }`
  - Response: `{ "message": "Reply added" }`

## Authentication

- Uses JWT stored in an HTTP-only cookie (`token`).
- Protected routes require the `token` cookie, verified by the `verifyToken` middleware.
- Example:

  ```bash
  curl -X GET http://localhost:5000/users/507f1f77bcf86cd799439011 \
  -H "Cookie: token=your-jwt-token"
  ```

## Project Structure

```
social-media-rest-api/
├── controllers/
│   └── userController.js
├── middlewares/
│   ├── error.middlewares.js
│   └── verifyToken.js
├── models/
│   ├── User.js
│   ├── Post.js
│   ├── Comment.js
│   └── Story.js
├── routes/
│   ├── auth.routes.js
│   └── user.routes.js
├── .env
├── app.js
├── package.json
└── README.md
```

## Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/your-feature`.
3. Commit changes: `git commit -m 'Add your feature'`.
4. Push to the branch: `git push origin feature/your-feature`.
5. Open a pull request.

## License

MIT License

## Contact

For issues or suggestions, open a GitHub issue or contact your-email@example.com.
