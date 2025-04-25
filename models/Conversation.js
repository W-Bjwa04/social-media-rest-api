import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema({
  participants: [
    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  ], // Array of user IDs involved in the conversation
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message" }, // Reference to the latest message
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
});

// Update `updatedAt` on every save
conversationSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const Conversation = mongoose.model("Conversation", conversationSchema);
export { Conversation };
