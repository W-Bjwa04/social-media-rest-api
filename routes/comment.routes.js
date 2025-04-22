import express from "express";

const router = express.Router();

import { verifyToken } from "../middlewares/verifyToken.js";

import {
  createCommentController,
  createCommentReplyController,
  updateCommentController,
  updateCommentReplyController,
  getAllCommentsOnPostController,
} from "../controllers/commentController.js";

// create the comment

router.route("/:postid").post(verifyToken, createCommentController);

// create reply for the comment

router
  .route("/reply/:commentid")
  .post(verifyToken, createCommentReplyController);

// update the comment

router.route("/:commentid").put(verifyToken, updateCommentController);

// update the comment reply

router
  .route("/reply/:commentid/:replyid")
  .put(verifyToken, updateCommentReplyController);

// get all the comment on a post

router.route("/post/:postid").get(verifyToken, getAllCommentsOnPostController);

export default router;
