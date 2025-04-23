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

// controller for delete a comment
const deleteCommentController = async (req, res, next) => {
  try {
    const { commentid } = req.params;

    // ✅ Check if ID is valid
    if (!mongoose.Types.ObjectId.isValid(commentid)) {
      throw new CustomError("Comment ID not valid", 400);
    }

    const comment = await Comment.findById(commentid);
    if (!comment) {
      throw new CustomError("Comment not found", 404);
    }

    // ✅ Authorization check
    if (comment.user.toString() !== req.user._id.toString()) {
      throw new CustomError(
        "You are not authorized to delete this comment",
        403
      );
    }

    // ✅ Remove comment reference from the post
    const post = await Post.findByIdAndUpdate(
      comment.post,
      { $pull: { comments: comment._id } },
      { new: true, runValidators: true }
    );

    if (!post) {
      throw new CustomError("Post associated with the comment not found", 404);
    }

    // ✅ Remove comment reference from the user
    const user = await User.findByIdAndUpdate(
      comment.user,
      { $pull: { comments: comment._id } },
      { new: true, runValidators: true }
    );

    if (!user) {
      throw new CustomError("User associated with the comment not found", 404);
    }

    // ✅ Delete the comment
    const deletedComment = await comment.deleteOne(); // no need to pass `{ _id }` again

    if (!deletedComment) {
      throw new CustomError("Unable to delete the comment", 500);
    }

    return res.status(200).json({
      message: "Comment deleted successfully",
    });
  } catch (error) {
    next(error); // ✅ Always forward to error handler
  }
};

// controller for delete the reply on an comment

const deleteReplyCommentController = async (req, res, next) => {
  try {
    const { commentid, replyid } = req.params;

    if (!mongoose.Types.ObjectId.isValid(commentid)) {
      throw new CustomError("Comment Id not valid", 400);
    }

    const comment = await Comment.findById(commentid);

    if (!comment) {
      throw new CustomError("Comment Not Found", 404);
    }

    if (!mongoose.Types.ObjectId.isValid(replyid)) {
      throw new CustomError("Reply Id not valid", 400);
    }

    const reply = comment.replies.id(replyid);

    if (!reply) {
      throw new CustomError("Reply Not Found", 404);
    }

    // Check if current user owns the reply

    if (reply.user.toString() !== req.user._id.toString()) {
      throw new CustomError("You are not authorized to delete this reply", 403);
    }

    const updatedComment = await Comment.findByIdAndUpdate(
      commentid,
      { $pull: { replies: { _id: replyid } } },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedComment) {
      throw new CustomError("Comment not updated", 500);
    }

    return res.status(200).json({
      message: "Reply deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// controller for like the comment

// Controller to like a comment
const likeCommentController = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { commentid } = req.params;

    if (!mongoose.Types.ObjectId.isValid(commentid)) {
      throw new CustomError("Comment Id not valid", 400);
    }

    const comment = await Comment.findById(commentid).session(session);
    if (!comment) {
      throw new CustomError("Comment Not Found", 404);
    }

    if (comment.likes.includes(req.user._id)) {
      throw new CustomError("You have already liked this comment", 400);
    }

    const updatedComment = await Comment.findByIdAndUpdate(
      commentid,
      { $addToSet: { likes: req.user._id } },
      { new: true, runValidators: true, session }
    );

    if (!updatedComment) {
      throw new CustomError("Unable to like the comment", 500);
    }

    await session.commitTransaction();

    return res.status(200).json({
      message: "Comment Liked Successfully",
      comment: updatedComment,
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// controller for dislike the comment

const dislikeCommentController = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { commentid } = req.params;

    if (!mongoose.Types.ObjectId.isValid(commentid)) {
      throw new CustomError("Comment Id not valid", 400);
    }

    const comment = await Comment.findById(commentid).session(session);
    if (!comment) {
      throw new CustomError("Comment Not Found", 404);
    }

    if (!comment.likes.includes(req.user._id)) {
      throw new CustomError("Like Comment First Before Unlike", 400);
    }

    const updatedComment = await Comment.findByIdAndUpdate(
      commentid,
      { $pull: { likes: req.user._id } },
      { new: true, runValidators: true, session }
    );

    if (!updatedComment) {
      throw new CustomError("Unable to unlike the comment", 500);
    }

    await session.commitTransaction();

    return res.status(200).json({
      message: "Comment UnLiked Successfully",
      comment: updatedComment,
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// controller for like the comment reply

const likeCommentReplyController = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { commentid, replyid } = req.params;

    // Validate comment ID
    if (!mongoose.Types.ObjectId.isValid(commentid)) {
      throw new CustomError("Comment Id not valid", 400);
    }

    // Validate reply ID
    if (!mongoose.Types.ObjectId.isValid(replyid)) {
      throw new CustomError("Reply Id not valid", 400);
    }

    // Find the comment
    const comment = await Comment.findById(commentid)
      .select("replies")
      .session(session);
    if (!comment) {
      throw new CustomError("Comment Not Found", 404);
    }

    // Find the reply
    const reply = comment.replies.id(replyid);
    if (!reply) {
      throw new CustomError("Reply Not Found", 404);
    }

    // Check for duplicate like
    if (reply.likes.includes(req.user._id)) {
      throw new CustomError("You have already liked this reply", 400);
    }

    // Atomically add the user's ID to reply.likes
    const updatedComment = await Comment.findOneAndUpdate(
      { _id: commentid, "replies._id": replyid },
      { $push: { "replies.$.likes": req.user._id } },
      { new: true, runValidators: true, session }
    );

    if (!updatedComment) {
      throw new CustomError("Unable to like the reply", 500);
    }

    await session.commitTransaction();

    // Return only the updated reply for efficiency
    const updatedReply = updatedComment.replies.id(replyid);
    return res.status(200).json({
      message: "Comment Reply Liked Successfully",
      reply: updatedReply,
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// controller for unlike the comment reply

const dislikeCommentReplyController = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { commentid, replyid } = req.params;

    // Validate comment ID
    if (!mongoose.Types.ObjectId.isValid(commentid)) {
      throw new CustomError("Comment Id not valid", 400);
    }

    // Validate reply ID
    if (!mongoose.Types.ObjectId.isValid(replyid)) {
      throw new CustomError("Reply Id not valid", 400);
    }

    // Find the comment
    const comment = await Comment.findById(commentid)
      .select("replies")
      .session(session);
    if (!comment) {
      throw new CustomError("Comment Not Found", 404);
    }

    // Find the reply
    const reply = comment.replies.id(replyid);
    if (!reply) {
      throw new CustomError("Reply Not Found", 404);
    }

    // Check if the user has liked the reply
    if (!reply.likes.includes(req.user._id)) {
      throw new CustomError("Like The Reply First Before Dislike", 400);
    }

    // Atomically remove the user's ID from reply.likes
    const updatedComment = await Comment.findOneAndUpdate(
      { _id: commentid, "replies._id": replyid },
      { $pull: { "replies.$.likes": req.user._id } },
      { new: true, runValidators: true, session }
    );

    if (!updatedComment) {
      throw new CustomError("Unable to unlike the reply", 500);
    }

    await session.commitTransaction();

    // Return only the updated reply for efficiency
    const updatedReply = updatedComment.replies.id(replyid);
    return res.status(200).json({
      message: "Comment Reply DisLiked Successfully",
      reply: updatedReply,
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

export {
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
};
