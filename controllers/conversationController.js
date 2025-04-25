import mongoose from "mongoose";
import { CustomError } from "../middlewares/error.middlewares.js";
import { User } from "../models/User.js";
import { Conversation } from "../models/Conversation.js";
import { Message } from "../models/Message.js";

// Start a new conversation
const startConversationController = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { participantid } = req.body; // ID of the user to start a conversation with

    console.log(participantid);

    if (!mongoose.Types.ObjectId.isValid(participantid)) {
      throw new CustomError("Invalid participant ID", 400);
    }

    if (participantid === req.user._id.toString()) {
      throw new CustomError("Cannot start a conversation with yourself", 400);
    }

    const participant = await User.findById(participantid).session(session);
    if (!participant) {
      throw new CustomError("Participant not found", 404);
    }

    // Check blockList
    const currentUser = await User.findById(req.user._id).session(session);
    if (currentUser.blockList.includes(participantid)) {
      throw new CustomError("You have blocked this user", 403);
    }
    if (participant.blockList.includes(req.user._id)) {
      throw new CustomError("You are blocked by this user", 403);
    }

    // Check if a conversation already exists between these users
    const existingConversation = await Conversation.findOne({
      participants: { $all: [req.user._id, participantid] },
    }).session(session);

    if (existingConversation) {
      await session.commitTransaction();
      return res.status(200).json({
        message: "Conversation already exists",
        conversation: existingConversation,
      });
    }

    // Create a new conversation
    const conversation = await new Conversation({
      participants: [req.user._id, participantid],
    }).save({ session });

    await session.commitTransaction();

    return res.status(201).json({
      message: "Conversation started successfully",
      conversation,
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// Get all conversations for the authenticated user
const getUserConversationsController = async (req, res, next) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
    })
      .populate("participants", "username profilePicture")
      .populate("lastMessage")
      .sort({ updatedAt: -1 })
      .lean();

    return res.status(200).json({
      message: "Conversations fetched successfully",
      conversations,
    });
  } catch (error) {
    next(error);
  }
};

// Get a specific conversation and its messages
const getConversationController = async (req, res, next) => {
  try {
    const { conversationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      throw new CustomError("Invalid conversation ID", 400);
    }

    const conversation = await Conversation.findById(conversationId)
      .populate("participants", "username profilePicture")
      .lean();

    if (!conversation) {
      throw new CustomError("Conversation not found", 404);
    }

    if (!conversation.participants.some((p) => p._id.equals(req.user._id))) {
      throw new CustomError("Unauthorized: You are not a participant", 403);
    }

    const messages = await Message.find({ conversation: conversationId })
      .populate("sender", "username profilePicture")
      .sort({ createdAt: 1 })
      .lean();

    return res.status(200).json({
      message: "Conversation fetched successfully",
      conversation,
      messages,
    });
  } catch (error) {
    next(error);
  }
};

// Send a message in a conversation
const sendMessageController = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { conversationId } = req.params;
    const { content } = req.body;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      throw new CustomError("Invalid conversation ID", 400);
    }

    if (!content || content.trim() === "") {
      throw new CustomError("Message content cannot be empty", 400);
    }

    const conversation =
      await Conversation.findById(conversationId).session(session);
    if (!conversation) {
      throw new CustomError("Conversation not found", 404);
    }

    if (!conversation.participants.some((p) => p.equals(req.user._id))) {
      throw new CustomError("Unauthorized: You are not a participant", 403);
    }

    // Create the message
    const message = await new Message({
      conversation: conversationId,
      sender: req.user._id,
      content,
    }).save({ session });

    // Update the conversation's lastMessage and updatedAt
    conversation.lastMessage = message._id;
    conversation.updatedAt = Date.now();
    await conversation.save({ session });

    await session.commitTransaction();

    const populatedMessage = await Message.findById(message._id)
      .populate("sender", "username profilePicture")
      .lean();

    return res.status(201).json({
      message: "Message sent successfully",
      message: populatedMessage,
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// Mark a message as read
const markMessageAsReadController = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { messageId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      throw new CustomError("Invalid message ID", 400);
    }

    const message = await Message.findById(messageId).session(session);
    if (!message) {
      throw new CustomError("Message not found", 404);
    }

    const conversation = await Conversation.findById(
      message.conversation
    ).session(session);
    if (!conversation) {
      throw new CustomError("Conversation not found", 404);
    }

    if (!conversation.participants.some((p) => p.equals(req.user._id))) {
      throw new CustomError("Unauthorized: You are not a participant", 403);
    }

    if (message.sender.equals(req.user._id)) {
      throw new CustomError("You cannot mark your own message as read", 400);
    }

    if (message.readBy.includes(req.user._id)) {
      throw new CustomError("Message already marked as read", 400);
    }

    const updatedMessage = await Message.findByIdAndUpdate(
      messageId,
      { $addToSet: { readBy: req.user._id } },
      { new: true, runValidators: true, session }
    );

    if (!updatedMessage) {
      throw new CustomError("Failed to mark message as read", 500);
    }

    await session.commitTransaction();

    return res.status(200).json({
      message: "Message marked as read successfully",
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// Delete a conversation
const deleteConversationController = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { conversationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      throw new CustomError("Invalid conversation ID", 400);
    }

    const conversation =
      await Conversation.findById(conversationId).session(session);
    if (!conversation) {
      throw new CustomError("Conversation not found", 404);
    }

    if (!conversation.participants.some((p) => p.equals(req.user._id))) {
      throw new CustomError("Unauthorized: You are not a participant", 403);
    }

    // Delete all messages in the conversation
    await Message.deleteMany({ conversation: conversationId }, { session });

    // Delete the conversation
    await Conversation.deleteOne({ _id: conversationId }, { session });

    await session.commitTransaction();

    return res.status(200).json({
      message: "Conversation deleted successfully",
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

export {
  startConversationController,
  getUserConversationsController,
  getConversationController,
  sendMessageController,
  markMessageAsReadController,
  deleteConversationController,
};
