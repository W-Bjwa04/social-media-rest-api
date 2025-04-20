import mongoose from "mongoose";

// defining the reply schema

const replySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      requried: true, // Typo: should be "required"
      trim: true,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        requried: true, // Typo: should be "required"
      },
    ],
  },
  {
    timestapms: true, // Typo: should be "timestamps"
  }
);

const commentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    replies: [replySchema], // Embedded subdocuments
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        requried: true, // Typo: should be "required"
      },
    ],
  },
  {
    timestamps: true,
  }
);

// make the comment model

const Comment = mongoose.model("Comment", commentSchema);

// export the model

export { Comment };
