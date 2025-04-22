import express from "express";
import { verifyToken } from "../middlewares/verifyToken.js";
import { uploadMultipleImages } from "../middlewares/upload.js";
const router = express.Router();

import {
  createPostController,
  getAllPostsController,
  updatePostController,
  deletePostController,
  getPostController,
} from "../controllers/postController.js";

// create the post

router
  .route("/create")
  .post(verifyToken, uploadMultipleImages, createPostController);

// get all posts

router.route("/getpost/:userid").get(verifyToken, getAllPostsController);

// update the post

router
  .route("/update/:postid")
  .put(verifyToken, uploadMultipleImages, updatePostController);

// delete the post

router.route("/delete/:postid").delete(verifyToken, deletePostController);

// get details of a single post (no authetication needed)

router.route("/:postid").get(getPostController)

export default router;
