import mongoose from "mongoose";

const storySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    text: {
      type: String,
      required: true,
      trim: true,
    },

    image: [
      {
        type: String,
        required: false,
      },
    ],

    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    createdAt: {
      type: Date,
      default: Date.now,
      expires: 60 * 60 * 24, // 24 hours in seconds
    },
  },
  {
    timestamps: false,
  }
);

const Story = mongoose.model("Story", storySchema);

export { Story };
