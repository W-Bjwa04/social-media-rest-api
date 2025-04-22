import mongoose from "mongoose";
import { User } from "../models/User.js";
import { CustomError } from "../middlewares/error.middlewares.js";
import { Post } from "../models/Post.js";
import { Comment } from "../models/Comment.js";
import { Story } from "../models/Story.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../config/cloudinary.js";

// Get User Controller
const getUserController = async (req, res, next) => {
  try {
    const { userid } = req.params;

    // Validate user ID
    if (!mongoose.Types.ObjectId.isValid(userid)) {
      throw new CustomError("Invalid user ID", 400);
    }

    const user = await User.findById(userid).select("-password");
    if (!user) {
      throw new CustomError("User not found", 404);
    }

    return res.status(200).json({
      message: "User found",
      user,
    });
  } catch (error) {
    next(error);
  }
};

// Update User Controller
const updateUserController = async (req, res, next) => {
  let uploadedImagePublicId = null;

  try {
    const { userid } = req.params;
    const currentUserId = req.user._id.toString();

    // Validate user ID
    if (!mongoose.Types.ObjectId.isValid(userid)) {
      throw new CustomError("Invalid user ID", 400);
    }

    // Ensure the user can only update their own account
    if (userid !== currentUserId) {
      throw new CustomError("You can only update your own account", 403);
    }

    const user = await User.findById(userid);
    if (!user) {
      throw new CustomError("User not found", 404);
    }

    const updateData = {};
    const allowedFields = ["username", "fullName", "bio", "email"];

    // Update allowed fields
    for (const field of allowedFields) {
      if (req.body[field]) {
        updateData[field] = req.body[field];
      }
    }

    // Check if image type is provided and validate it
    if (req.file) {
      const { imageType } = req.body;

      // Validate image type: Only "profile" or "cover" is allowed
      const validImageTypes = ["profile", "cover"];
      const selectedImageType = validImageTypes.includes(imageType)
        ? imageType
        : "profile"; // Default to "profile" if invalid

      // Determine which field to update based on image type
      const field =
        selectedImageType === "profile" ? "profilePicture" : "coverPicture";
      const idField =
        selectedImageType === "profile" ? "profilePictureId" : "coverPictureId";

      // Delete old image from Cloudinary if it exists
      if (user[idField]) {
        try {
          console.log(`Deleting old image for ${selectedImageType}...`);
          await deleteFromCloudinary(user[idField]);
        } catch (err) {
          console.warn(`Failed to delete old image:`, err.message);
        }
      }

      // Upload new image to Cloudinary
      const uploadResult = await uploadOnCloudinary(req.file.path);
      if (!uploadResult) {
        throw new CustomError("Image upload failed", 500);
      }

      // Store the new image URL and public ID in the database
      updateData[field] = uploadResult.secure_url;
      updateData[idField] = uploadResult.public_id;
      uploadedImagePublicId = uploadResult.public_id; // Store to clean up if error occurs later
    }

    // Validate unique fields (username and email)
    if (updateData.username) {
      const existingUser = await User.findOne({
        username: updateData.username,
        _id: { $ne: userid },
      });
      if (existingUser) {
        throw new CustomError("Username already taken", 400);
      }
    }

    if (updateData.email) {
      const existingUser = await User.findOne({
        email: updateData.email,
        _id: { $ne: userid },
      });
      if (existingUser) {
        throw new CustomError("Email already taken", 400);
      }
    }

    // Update the user in the database
    const updatedUser = await User.findByIdAndUpdate(
      userid,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("-password");

    return res.status(200).json({
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    // If an image was uploaded but an error occurred later, delete it from Cloudinary
    if (uploadedImagePublicId) {
      await deleteFromCloudinary(uploadedImagePublicId);
    }

    console.error("Update user error:", error.message, error.stack);
    next(error);
  }
};

// Follow User Controller
const followUserController = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userid } = req.params;
    const currentUserId = req.user._id;

    // Validate user ID
    if (!mongoose.Types.ObjectId.isValid(userid)) {
      throw new CustomError("Invalid user ID", 400);
    }

    if (userid === currentUserId.toString()) {
      throw new CustomError("Cannot follow yourself", 400);
    }

    // Check if already followed
    const currentUser = await User.findById(currentUserId).session(session);
    if (!currentUser) {
      throw new CustomError("Current user not found", 404);
    }

    if (currentUser.following.includes(userid)) {
      throw new CustomError("User already followed", 400);
    }

    // Update both users atomically
    const updatedCurrentUser = await User.findByIdAndUpdate(
      currentUserId,
      { $addToSet: { following: userid } },
      { new: true, runValidators: true, session }
    ).select("-password");

    const updatedUserToFollow = await User.findByIdAndUpdate(
      userid,
      { $addToSet: { followers: currentUserId } },
      { new: true, runValidators: true, session }
    );

    if (!updatedUserToFollow) {
      throw new CustomError("User to follow not found", 404);
    }

    await session.commitTransaction();

    return res.status(200).json({
      message: "User followed successfully",
      user: updatedCurrentUser,
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// Unfollow User Controller
const unfollowUserController = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userid } = req.params;
    const currentUserId = req.user._id;

    // Validate user ID
    if (!mongoose.Types.ObjectId.isValid(userid)) {
      throw new CustomError("Invalid user ID", 400);
    }

    if (userid === currentUserId.toString()) {
      throw new CustomError("Cannot unfollow yourself", 400);
    }

    // Check if user is followed
    const currentUser = await User.findById(currentUserId).session(session);
    if (!currentUser) {
      throw new CustomError("Current user not found", 404);
    }

    if (!currentUser.following.includes(userid)) {
      throw new CustomError("User not followed", 400);
    }

    // Unfollow user
    const updatedCurrentUser = await User.findByIdAndUpdate(
      currentUserId,
      { $pull: { following: userid } },
      { new: true, runValidators: true, session }
    ).select("-password");

    const updatedUserToUnfollow = await User.findByIdAndUpdate(
      userid,
      { $pull: { followers: currentUserId } },
      { new: true, runValidators: true, session }
    );

    if (!updatedUserToUnfollow) {
      throw new CustomError("User to unfollow not found", 404);
    }

    await session.commitTransaction();

    return res.status(200).json({
      message: "User unfollowed successfully",
      user: updatedCurrentUser,
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// Block User Controller
const blockUserController = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userid } = req.params;
    const currentUserId = req.user._id;

    // Validate user ID
    if (!mongoose.Types.ObjectId.isValid(userid)) {
      throw new CustomError("Invalid user ID", 400);
    }

    // Prevent self-blocking
    if (userid === currentUserId.toString()) {
      throw new CustomError("Cannot block yourself", 400);
    }

    // Check if already blocked
    const currentUser = await User.findById(currentUserId).session(session);
    if (!currentUser) {
      throw new CustomError("Current user not found", 404);
    }

    if (currentUser.blockList.includes(userid)) {
      throw new CustomError("User already blocked", 400);
    }

    // Block user and remove from following/followers
    const updatedCurrentUser = await User.findByIdAndUpdate(
      currentUserId,
      {
        $addToSet: { blockList: userid },
        $pull: { following: userid },
      },
      { new: true, runValidators: true, session }
    ).select("-password");

    if (!updatedCurrentUser) {
      throw new CustomError("Current user not found", 404);
    }

    const updatedBlockedUser = await User.findByIdAndUpdate(
      userid,
      { $pull: { followers: currentUserId } },
      { new: true, runValidators: true, session }
    );

    if (!updatedBlockedUser) {
      throw new CustomError("User to block not found", 404);
    }

    await session.commitTransaction();

    return res.status(200).json({
      message: "User blocked successfully",
      user: updatedCurrentUser,
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// Unblock User Controller
const unblockUserController = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userid } = req.params;
    const currentUserId = req.user._id;

    // Validate user ID
    if (!mongoose.Types.ObjectId.isValid(userid)) {
      throw new CustomError("Invalid user ID", 400);
    }

    // Prevent self-unblocking
    if (userid === currentUserId.toString()) {
      throw new CustomError("Cannot unblock yourself", 400);
    }

    // Check if user is blocked
    const currentUser = await User.findById(currentUserId).session(session);
    if (!currentUser) {
      throw new CustomError("Current user not found", 404);
    }

    if (!currentUser.blockList.includes(userid)) {
      throw new CustomError("User not in your block list", 400);
    }

    // Unblock user
    const updatedCurrentUser = await User.findByIdAndUpdate(
      currentUserId,
      { $pull: { blockList: userid } },
      { new: true, runValidators: true, session }
    ).select("-password");

    if (!updatedCurrentUser) {
      throw new CustomError("Current user not found", 404);
    }

    await session.commitTransaction();

    return res.status(200).json({
      message: "User unblocked successfully",
      user: updatedCurrentUser,
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// Get Block List Controller
const getBlockListController = async (req, res, next) => {
  try {
    const currentUser = await User.findById(req.user._id).populate({
      path: "blockList",
      select: "username fullName profilePicture",
    });

    if (!currentUser) {
      throw new CustomError("Current user not found", 404);
    }

    const blockedList = currentUser.blockList;

    return res.status(200).json({
      message: "Block list fetched successfully",
      blockList: blockedList,
    });
  } catch (error) {
    next(error);
  }
};

const deleteUserController = async (req, res, next) => {
  try {
    const { userid } = req.params;
    const currentUserId = req.user._id.toString();

    // Validate user ID
    if (!mongoose.Types.ObjectId.isValid(userid)) {
      throw new CustomError("Invalid user ID", 400);
    }

    // Ensure the user is deleting their own account
    if (userid !== currentUserId) {
      throw new CustomError("You can only delete your own account", 403);
    }

    // 1. Delete user's posts and get their IDs
    const userPosts = await Post.find({ user: userid }, "_id");
    const postIds = userPosts.map((post) => post._id);

    if (postIds.length > 0) {
      await Post.deleteMany({ _id: { $in: postIds } });
    }

    // 2. Delete comments on user's posts, comments by the user, and update likes

    // Delete comments
    await Comment.deleteMany({
      $or: [{ post: { $in: postIds } }, { user: userid }],
    });

    // Remove user from likes in comments and replies
    await Comment.updateMany(
      {
        $or: [{ likes: userid }, { "replies.likes": userid }],
      },
      {
        $pull: {
          likes: userid,
          "replies.$[].likes": userid,
        },
      }
    );

    // 3. Delete user's stories

    await Story.deleteMany({ user: userid });

    // 4. Remove user from other users' followers, following, and blockList
    await User.updateMany(
      {
        $or: [
          { followers: userid },
          { following: userid },
          { blockList: userid },
        ],
      },
      {
        $pull: {
          followers: userid,
          following: userid,
          blockList: userid,
        },
      }
    );

    // 5. Remove user from likes on other posts

    await Post.updateMany({ likes: userid }, { $pull: { likes: userid } });

    // 6. Delete the user
    await User.deleteOne({ _id: userid });

    // Clear the user's session cookie
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
    });

    return res.status(200).json({
      message: "User and related data deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

const searchUserController = async (req, res, next) => {
  try {
    const { query } = req.params;

    if (!query) {
      throw new CustomError("No Query Is Present to search the user", 404);
    }

    const users = await User.find(
      {
        $or: [
          { username: { $regex: query, $options: "i" } },
          { fullName: { $regex: query, $options: "i" } },
          { email: { $regex: query, $options: "i" } },
        ],
      },
      "_id username fullName profilePicture" // Projection
    );

    return res.status(200).json({
      message: "Search Result",
      users,
    });
  } catch (error) {
    next(error);
  }
};

export {
  getUserController,
  updateUserController,
  followUserController,
  unfollowUserController,
  blockUserController,
  unblockUserController,
  getBlockListController,
  deleteUserController,
  searchUserController,
};
