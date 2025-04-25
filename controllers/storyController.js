import { Post } from "../models/Post.js";
import { User } from "../models/User.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../config/cloudinary.js";
import { CustomError } from "../middlewares/error.middlewares.js";
import mongoose from "mongoose";
import cloudinary from "cloudinary";
import { Story } from "../models/Story.js";

// Helper function to generate secure URLs
const getUrlFromImageId = (publicIds) => {
  try {
    return publicIds.map((publicId) =>
      cloudinary.url(publicId, {
        resource_type: "image",
        secure: true,
      })
    );
  } catch (error) {
    throw new CustomError("Failed to generate image URLs", 500);
  }
};

// Create a story
const createStoryController = async (req, res, next) => {
  const { userid } = req.params;
  const { text } = req.body;
  const imagesIds = [];

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const hasUpdate = Boolean(text?.trim()) || Boolean(req.files?.length);
    if (!hasUpdate) {
      throw new CustomError(
        "At least one field (text, story images) must be provided",
        400
      );
    }

    if (!mongoose.Types.ObjectId.isValid(userid)) {
      throw new CustomError("Invalid User Id", 400);
    }

    if (userid !== req.user._id.toString()) {
      throw new CustomError(
        "Unauthorized: You can only create stories for yourself",
        403
      );
    }

    const user = await User.findById(userid).session(session);
    if (!user) {
      throw new CustomError("User not found", 404);
    }

    if (req.files && req.files.length > 0) {
      if (req.files.length > 10) {
        throw new CustomError("Maximum 10 images allowed", 400);
      }

      for (const file of req.files) {
        const uploaded = await uploadOnCloudinary(file.path);
        if (!uploaded || !uploaded.public_id) {
          throw new CustomError("Failed to upload images", 500);
        }
        imagesIds.push(uploaded.public_id);
      }
    }

    const story = await new Story({
      user: user._id,
      text: text,
      image: imagesIds,
    }).save({ session });

    await session.commitTransaction();

    return res.status(200).json({
      message: "Story created successfully",
      story: story,
    });
  } catch (error) {
    await session.abortTransaction();
    for (const publicId of imagesIds) {
      try {
        await deleteFromCloudinary(publicId);
      } catch (cleanupErr) {
        console.error(
          `Cleanup failed for image ${publicId}: ${cleanupErr.message}`
        );
      }
    }
    next(error);
  } finally {
    session.endSession();
  }
};

// Get a story by ID
const getStoryController = async (req, res, next) => {
  const { storyid } = req.params;
  const userid = req.user._id;
  try {
    if (!mongoose.Types.ObjectId.isValid(storyid)) {
      throw new CustomError("Invalid Story Id", 400);
    }

    const story = await Story.findById(storyid)
      .select("user text image createdAt")
      .populate("user")
      .lean();
    if (!story) {
      throw new CustomError("Story not found", 404);
    }

    if (story.user._id.toString() !== userid.toString()) {
      throw new CustomError("Unauthorized", 401);
    }

    const sanitizedStory = story;
    sanitizedStory.image = getUrlFromImageId(story.image);

    return res.status(200).json({
      message: "Story fetched successfully",
      story: sanitizedStory,
    });
  } catch (error) {
    next(error);
  }
};

// Get a user's stories
const getUserStoryController = async (req, res, next) => {
  try {
    const { userid } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userid)) {
      throw new CustomError("Invalid User Id", 400);
    }

    const searchedUser = await User.findById(userid).lean();
    if (!searchedUser) {
      throw new CustomError("Searched User Not Found", 404);
    }

    const isBlockedBySearched = searchedUser.blockList.includes(req.user._id);
    if (isBlockedBySearched) {
      throw new CustomError("You are blocked by the searched user", 403);
    }

    const isBlockedByCurrent = req.user.blockList.includes(searchedUser._id);
    if (isBlockedByCurrent) {
      throw new CustomError("You have blocked the searched user", 403);
    }

    const stories = await Story.find({ user: userid })
      .select("user text image createdAt")
      .populate("user")
      .sort({ createdAt: -1 })
      .lean();

    if (stories.length === 0) {
      throw new CustomError("No stories found for this user", 404);
    }

    const sanitizedStories = stories.map((story) => {
      const sanitizedStory = story;
      sanitizedStory.image = getUrlFromImageId(story.image);
      return sanitizedStory;
    });

    return res.status(200).json({
      message: "Stories fetched successfully",
      stories: sanitizedStories,
    });
  } catch (error) {
    next(error);
  }
};

// Update a story
const updateStoryController = async (req, res, next) => {
  const storyImagesId = [];
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { storyid } = req.params;
    const { text } = req.body;
    const deleteImages = req.body.deleteImages
      ? req.body.deleteImages.split(",").filter(Boolean)
      : [];

    const hasUpdate =
      Boolean(text?.trim()) ||
      Boolean(deleteImages?.length) ||
      Boolean(req.files?.length);

    if (!hasUpdate) {
      throw new CustomError(
        "At least one field (text, deleteImages, or new images) must be provided",
        400
      );
    }

    if (!mongoose.Types.ObjectId.isValid(storyid)) {
      throw new CustomError("Invalid story ID", 400);
    }

    const story = await Story.findById(storyid).session(session);
    if (!story) {
      throw new CustomError("Story not found", 404);
    }

    if (story.user.toString() !== req.user._id.toString()) {
      throw new CustomError("You are not the owner of the story", 403);
    }

    const updateData = { image: story.image };

    if (text?.trim()) {
      updateData.text = text;
    }

    if (deleteImages.length > 0) {
      const invalidImages = deleteImages.filter(
        (image) => !updateData.image.includes(image)
      );
      if (invalidImages.length > 0) {
        throw new CustomError(
          `Invalid image IDs: ${invalidImages.join(", ")}`,
          400
        );
      }

      await Promise.all(
        deleteImages.map((imageID) => deleteFromCloudinary(imageID))
      );

      updateData.image = story.image.filter(
        (img) => !deleteImages.includes(img)
      );
    }

    if (req.files && req.files.length > 0) {
      const totalImages = updateData.image.length + req.files.length;
      if (totalImages > 10) {
        throw new CustomError("Maximum 10 images allowed", 400);
      }

      for (const file of req.files) {
        const uploaded = await uploadOnCloudinary(file.path);
        if (!uploaded || !uploaded.public_id) {
          throw new CustomError("Failed to upload images", 500);
        }
        storyImagesId.push(uploaded.public_id);
      }

      updateData.image = [...storyImagesId, ...updateData.image];
    }

    const updatedStory = await Story.findByIdAndUpdate(storyid, updateData, {
      new: true,
      runValidators: true,
      session,
    });

    if (!updatedStory) {
      throw new CustomError("Failed to update the story", 500);
    }

    await session.commitTransaction();

    

    return res.status(200).json({
      message: "Story updated successfully",
      story: updatedStory,
    });
  } catch (error) {
    await session.abortTransaction();
    for (const publicId of storyImagesId) {
      try {
        await deleteFromCloudinary(publicId);
      } catch (cleanupErr) {
        console.error(
          `Cleanup failed for image ${publicId}: ${cleanupErr.message}`
        );
      }
    }
    next(error);
  } finally {
    session.endSession();
  }
};

// Delete a story
const deleteStoryController = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { storyid } = req.params;
    const userid = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(storyid)) {
      throw new CustomError("Invalid Story Id", 400);
    }

    const story = await Story.findById(storyid).session(session);
    if (!story) {
      throw new CustomError("Story not found", 404);
    }

    if (story.user.toString() !== userid.toString()) {
      throw new CustomError("Unauthorized", 401);
    }

    const imagesIds = story.image;

    await Promise.all(
      imagesIds.map((imageID) => deleteFromCloudinary(imageID))
    );

    const deletedStory = await Story.findByIdAndDelete(storyid, { session });
    if (!deletedStory) {
      throw new CustomError("Failed to delete the story", 500);
    }

    await session.commitTransaction();

    return res.status(200).json({
      message: "Story deleted successfully",
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// Like a story
const likeStoryController = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { storyid } = req.params;
    const userid = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(storyid)) {
      throw new CustomError("Invalid Story Id", 400);
    }

    const story = await Story.findById(storyid).session(session);
    if (!story) {
      throw new CustomError("Story not found", 404);
    }

    const updateOperation = story.likes.includes(userid)
      ? { $pull: { likes: userid } }
      : { $addToSet: { likes: userid } };

    const updatedStory = await Story.findByIdAndUpdate(
      storyid,
      updateOperation,
      { new: true, runValidators: true, session }
    );

    if (!updatedStory) {
      throw new CustomError("Failed to update the story", 500);
    }

    await session.commitTransaction();

    const storyResponse = updatedStory.toJSON();
    storyResponse.image = getUrlFromImageId(updatedStory.image);

    return res.status(200).json({
      message: story.likes.includes(userid)
        ? "Story unliked successfully"
        : "Story liked successfully",
      story: storyResponse,
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// Dislike a story
const dislikeStoryController = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { storyid } = req.params;
    const userid = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(storyid)) {
      throw new CustomError("Invalid Story Id", 400);
    }

    const story = await Story.findById(storyid).session(session);
    if (!story) {
      throw new CustomError("Story not found", 404);
    }

    if (!story.likes.includes(userid)) {
      throw new CustomError("You have not liked the story", 400);
    }

    const updatedStory = await Story.findByIdAndUpdate(
      storyid,
      { $pull: { likes: userid } },
      { new: true, runValidators: true, session }
    );

    if (!updatedStory) {
      throw new CustomError("Failed to update the story", 500);
    }

    await session.commitTransaction();

    const storyResponse = updatedStory.toJSON();
    storyResponse.image = getUrlFromImageId(updatedStory.image);

    return res.status(200).json({
      message: "Story disliked successfully",
      story: storyResponse,
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

export {
  createStoryController,
  getStoryController,
  getUserStoryController,
  updateStoryController,
  deleteStoryController,
  likeStoryController,
  dislikeStoryController,
};
