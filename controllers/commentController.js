import { Comment } from "../models/Comment.js";
import { Post } from "../models/Post.js";
import { User } from "../models/User.js";
import { CustomError } from "../middlewares/error.middlewares.js";
import mongoose from "mongoose";

// controller for create the comment
const createCommentController = async (req, res, next) => {
  try {
    const { postid } = req.params;

    if (!mongoose.Types.ObjectId.isValid(postid)) {
      throw new CustomError("Post Id not valid", 400);
    }

    const post = await Post.findById(postid);

    if (!post) {
      throw new CustomError("Post Not Found", 404);
    }

    const { text } = req.body;

    if (!text) {
      throw new CustomError("No text is given for comment", 400);
    }

    const comment = await new Comment({
      text,
      post: postid,
      user: req.user._id,
    }).save();

    if (!comment) {
      throw new CustomError("Comment not created", 500);
    }

    // add the comment to the post table

    post.comments.push(comment._id);

    await post.save();

    return res.status(201).json({
      message: "Comment created successfully",
      comment,
    });
  } catch (error) {
    next(error);
  }
};

// controller for reply on the comment

const createCommentReplyController = async (req, res, next) => {
  try {
    const { commentid } = req.params;
    const { text } = req.body;

    if (!mongoose.Types.ObjectId.isValid(commentid)) {
      throw new CustomError("Comment Id not valid", 400);
    }

    const comment = await Comment.findById(commentid);

    if (!comment) {
      throw new CustomError("Comment Not Found", 404);
    }

    if (!text) {
      throw new CustomError("No text is given for comment", 400);
    }

    const reply = {
      user: req.user._id,
      text: text,
    };

    // push the reply to the comment

    comment.replies.push(reply);

    const updatedComment = await comment.save();

    return res.status(200).json({
      message: "Reply added successfully",
      comment: updatedComment,
    });
  } catch (error) {
    next(error);
  }
};

const updateCommentController = async (req, res, next) => {
  const { commentid } = req.params;
  const { text } = req.body;
  if (!mongoose.Types.ObjectId.isValid(commentid)) {
    throw new CustomError("Comment Id not valid", 400);
  }

  const comment = await Comment.findById(commentid);

  if (!comment) {
    throw new CustomError("Comment Not Found", 404);
  }

  if (!text) {
    throw new CustomError("No text is given for comment update", 400);
  }

  // check of the current user is the owner of the comment or not

  // Optional: Check if current user owns the reply
  if (comment.user.toString() !== req.user._id.toString()) {
    throw new CustomError("You are not authorized to edit this comment", 403);
  }

  const updatedComment = await Comment.findByIdAndUpdate(
    commentid,
    { text: text },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!updatedComment) {
    throw new CustomError("Comment not updated", 500);
  }

  return res.status(200).json({
    message: "Comment Updated Successfully",
  });
};

const updateCommentReplyController = async (req, res, next) => {
  try {
    const { commentid, replyid } = req.params;
    const { text } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(commentid) ||
      !mongoose.Types.ObjectId.isValid(replyid)
    ) {
      throw new CustomError("Invalid Comment ID or Reply ID", 400);
    }

    if (!text || !text.trim()) {
      throw new CustomError("Reply text is required", 400);
    }

    const comment = await Comment.findById(commentid);

    if (!comment) {
      throw new CustomError("Comment not found", 404);
    }

    // Find the reply
    const reply = comment.replies.id(replyid);

    if (!reply) {
      throw new CustomError("Reply not found", 404);
    }

    // Optional: Check if current user owns the reply
    if (reply.user.toString() !== req.user._id.toString()) {
      throw new CustomError("You are not authorized to edit this reply", 403);
    }

    // Update the reply text and updatedAt
    reply.text = text.trim();
    reply.updatedAt = new Date();

    const updatedComment = await comment.save();

    return res.status(200).json({
      message: "Reply updated successfully",
      comment: updatedComment,
    });
  } catch (error) {
    next(error);
  }
};

// get all the comment on the post

const getAllCommentsOnPostController = async (req, res, next) => {
  try {
    const { postid } = req.params;

    if (!mongoose.Types.ObjectId.isValid(postid)) {
      throw new CustomError("Post ID is not valid", 400);
    }

    const post = await Post.findById(postid);
    if (!post) {
      throw new CustomError("Post not found", 404);
    }

    const comments = await Comment.find({ post: postid })
      .populate("user", "fullName profilePicture")
      .populate("replies.user", "fullName profilePicture");

    return res.status(200).json({
      message: "Comments fetched successfully",
      comments,
    });
  } catch (error) {
    next(error);
  }
};

export {
  createCommentController,
  createCommentReplyController,
  updateCommentController,
  updateCommentReplyController,
  getAllCommentsOnPostController,
};
