import express from "express";

const router = express.Router();

import { verifyToken } from "../middlewares/verifyToken.js";

import {
  startConversationController,
  getUserConversationsController,
  getConversationController,
  sendMessageController,
  markMessageAsReadController,
  deleteConversationController,
} from "../controllers/conversationController.js";

// start a conversation
router.route("/start").post(verifyToken, startConversationController);

// Get all conversations for the authenticated user
router.route("/").get(verifyToken, getUserConversationsController);

// Get a specific conversation and its messages
router.route("/:conversationId").get(verifyToken, getConversationController);

// Send a message in a conversation
router
  .route("/:conversationId/message")
  .post(verifyToken, sendMessageController);

// Mark a message as read
router
  .route("/message/:messageId/read")
  .post(verifyToken, markMessageAsReadController);

// Delete a conversation
router
  .route("/:conversationId")
  .delete(verifyToken, deleteConversationController);

export default router;
