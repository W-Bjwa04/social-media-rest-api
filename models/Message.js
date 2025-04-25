import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Conversation",
    required: true,
  },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, index: true },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Users who have read the message
});

const Message = mongoose.model("Message", messageSchema);
export { Message };
