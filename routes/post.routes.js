import express from "express";
import { verifyToken } from "../middlewares/verifyToken.js";
import { uploadMultipleImages } from "../middlewares/upload.js";
const router = express.Router();

import {
  createPostController,
  getAllPostsController,
  updatePostController,
} from "../controllers/postController.js";

// create the post

router
  .route("/create")
  .post(verifyToken, uploadMultipleImages, createPostController);

// get all posts

router.route("/getpost/:userid").get(verifyToken, getAllPostsController);

// update the post

router.route("/update/:postid").put(verifyToken, uploadMultipleImages,updatePostController);

export default router;
