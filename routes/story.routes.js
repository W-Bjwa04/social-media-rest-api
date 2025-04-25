import express from "express";

const router = express.Router();

import { verifyToken } from "../middlewares/verifyToken.js";
import { uploadMultipleImages } from "../middlewares/upload.js";

import {
  createStoryController,
  getStoryController,
  getUserStoryController,
  updateStoryController,
  deleteStoryController,
  likeStoryController,
  dislikeStoryController,
} from "../controllers/storyController.js";

// Create a story
router
  .route("/create/:userid")
  .post(verifyToken, uploadMultipleImages, createStoryController);

// Get a story by ID
router.route("/:storyid").get(verifyToken, getStoryController);

// Get all stories of a specific user
router.route("/user/:userid").get(verifyToken, getUserStoryController);

// Update a story
router
  .route("/update/:storyid")
  .put(verifyToken, uploadMultipleImages, updateStoryController);

// Delete a story
router.route("/delete/:storyid").delete(verifyToken, deleteStoryController);

// Like a story
router.route("/like/:storyid").post(verifyToken, likeStoryController);

// Unlike a story
router.route("/unlike/:storyid").post(verifyToken, dislikeStoryController);

export default router;