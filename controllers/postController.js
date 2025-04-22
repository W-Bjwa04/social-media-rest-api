import { Post } from "../models/Post.js";
import { User } from "../models/User.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../config/cloudinary.js";
import { CustomError } from "../middlewares/error.middlewares.js";
import mongoose from "mongoose";
import cloudinary from "cloudinary";

// controller for create the post
const createPostController = async (req, res, next) => {
  const postImagesId = []; // public id for the post images

  try {
    const { caption } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);

    if (!caption) {
      throw new CustomError("No Caption is given for post creation", 404);
    }

    // if the images are present for the post

    if (req.files && req.files.length > 0) {
      if (req.files.length > 10) {
        throw new CustomError("Maximum 10 images allowed", 400);
      }

      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];

        // upload that file on the cloudinary

        const uploadedResult = await uploadOnCloudinary(file.path);

        if (!uploadedResult) {
          throw new CustomError("Failed To Upload Images", 404);
        }

        // push the public id of the images to the array
        postImagesId.push(uploadedResult.public_id);
      }
    }

    const post = await new Post({
      user: user._id,
      caption: caption,
      image: postImagesId,
    }).save();

    if (!post) {
      throw new CustomError("Failed To Create new post", 404);
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $push: { posts: post._id },
      },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      throw new CustomError("Failed To Save the post to the user", 404);
    }

    return res.status(200).json({
      message: "Post Created Successfully",
      post: post,
    });
  } catch (error) {
    for (const publicId of postImagesId) {
      await deleteFromCloudinary(publicId);
    }

    console.error("Post Creation Error:", error.message);
    next(error);
  }
};

// controller for get all posts of an user

const getAllPostsController = async (req, res, next) => {
  try {
    const { userid } = req.params;

    // Validate user ID
    if (!mongoose.Types.ObjectId.isValid(userid)) {
      throw new CustomError("Invalid user ID", 400);
    }

    const searchedUser = await User.findById(userid).select("-password");
    if (!searchedUser) {
      throw new CustomError("User not found", 404);
    }

    // find verify whether the current user is in the block list of searched user

    const isBlockedFromUser = searchedUser.blockList.includes(req.user._id);

    if (isBlockedFromUser) {
      throw new CustomError("You are blocked by the user", 403);
    }

    // verify whether i block the user

    const blockedByMe = await req.user.blockList.includes(userid);

    if (blockedByMe) {
      throw new CustomError("First Unblock to see user posts", 403);
    }

    // get all the posts for the searched user

    const posts = await Post.find({ user: userid });

    // if the post exits

    if (!posts) {
      throw new CustomError("Failed to fetch the post", 404);
    }

    posts.map((post) => {
      const url = getUrlFromImageId(post.image);
      post.image = url;
    });

    return res.status(200).json({
      message: "Posts fetched successfully",
      posts: posts,
    });
  } catch (error) {
    next(error);
  }
};

// controller for update the post

const updatePostController = async (req, res, next) => {
  const postImagesId = []; // for cleanup in case of new uploads

  try {
    const { postid } = req.params;
    const { caption } = req.body;

    const deleteImages = req.body.deleteImages
      ? req.body.deleteImages.split(",").filter(Boolean)
      : []; //Use .filter(Boolean) to remove any empty strings from the array:

    const hasUpdate =
      Boolean(caption?.trim()) ||
      Boolean(deleteImages?.length) ||
      Boolean(req.files?.length);

    if (!hasUpdate) {
      throw new CustomError(
        "At least one field (caption, deleteImages, or new images) must be provided",
        404
      );
    }

    // Validate post ID
    if (!mongoose.Types.ObjectId.isValid(postid)) {
      throw new CustomError("Invalid post ID", 400);
    }

    // Find the post
    const post = await Post.findById(postid);
    if (!post) {
      throw new CustomError("Post not found", 404);
    }

    // Check ownership
    if (!req.user.posts.some((id) => id.toString() === post._id.toString())) {
      throw new CustomError("You are not the owner of the post", 403);
    }

    const updateData = { image: post.image };

    // Update caption if valid
    if (caption?.trim()) {
      updateData.caption = caption;
    }

    // Handle deleteImages (early validation)
    if (deleteImages && deleteImages.length > 0) {
      deleteImages.map((image) => {
        if (image === "" || !updateData.image.includes(image)) {
          throw new CustomError(`Invalid image ID: ${image}`);
        }
      });
    }

    // Delete from Cloudinary
    await Promise.all(
      deleteImages.map((imageID) => deleteFromCloudinary(imageID))
    );

    // Update image list
    updateData.image = post.image.filter((img) => !deleteImages.includes(img));

    // Handle new uploads
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
        postImagesId.push(uploaded.public_id);
      }

      updateData.image = [...postImagesId, ...updateData.image];
    }

    const updatedPost = await Post.findByIdAndUpdate(postid, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedPost) {
      throw new CustomError("Failed to update the post", 500);
    }

    const postResponse = updatedPost.toJSON();
    postResponse.image = getUrlFromImageId(updatedPost.image);

    return res.status(200).json({
      message: "Post updated successfully",
      post: postResponse,
    });
  } catch (error) {
    // Cleanup in case of error
    for (const publicId of postImagesId) {
      try {
        await deleteFromCloudinary(publicId);
      } catch (cleanupErr) {
        console.error(
          `Cleanup failed for image ${publicId}: ${cleanupErr.message}`
        );
      }
    }
    next(error);
  }
};

const deletePostController = async (req, res, next) => {
  const { postid } = req.params;
  
  if(!mongoose.Types.ObjectId.includes(postid)){
    throw new CustomError("Invalid post ID", 400)
  }

  

};

// helper function

const getUrlFromImageId = (publicIds) => {
  return publicIds.map((publicId) =>
    cloudinary.url(publicId, {
      resource_type: "image",
      secure: true,
    })
  );
};

export { createPostController, getAllPostsController, updatePostController };
