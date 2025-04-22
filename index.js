// Very top of your entry file
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";

import connectDB from "./database/db.js";
import cookieParser from "cookie-parser";
import { errorHanlder } from "./middlewares/error.middlewares.js";

const app = express();

app.use(cors());

app.use(express.json());

app.use(cookieParser());

// import the router of the app

import AuthRouter from "./routes/auth.routes.js";

app.use("/api/auth", AuthRouter);

import UserRouter from "./routes/user.routes.js";

app.use("/api/user", UserRouter);

import PostRouter from "./routes/post.routes.js";

app.use("/api/post", PostRouter);

import CommentRouter from "./routes/comment.routes.js";

app.use("/api/comment", CommentRouter);

app.use(errorHanlder);

app.listen(process.env.PORT, async (req, res) => {
  await connectDB();
  console.log(`Server is runnig on port 5000`);
});
