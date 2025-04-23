import express from "express";

const router = express.Router();

import { verifyToken } from "../middlewares/verifyToken.js";

import {
  createCommentController,
  createCommentReplyController,
  updateCommentController,
  updateCommentReplyController,
  getAllCommentsOnPostController,
  deleteCommentController,
  deleteReplyCommentController,
  likeCommentController,
  dislikeCommentController,
  likeCommentReplyController,
  dislikeCommentReplyController,
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

// delete the comment

router.route("/:commentid").delete(verifyToken, deleteCommentController);

// delete comment reply

router
  .route("/reply/:commentid/:replyid")
  .delete(verifyToken, deleteReplyCommentController);

// like the comment
router.route("/like/:commentid").get(verifyToken, likeCommentController);

// dislike the comment

router.route("/dislike/:commentid").get(verifyToken, dislikeCommentController);

// like the comment reply

router
  .route("/like/reply/:commentid/:replyid")
  .get(verifyToken, likeCommentReplyController);

// dislike the comment reply

router
  .route("/dislike/reply/:commentid/:replyid")
  .get(verifyToken, dislikeCommentReplyController);

export default router;
