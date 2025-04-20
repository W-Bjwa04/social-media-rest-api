import mongoose from "mongoose";

const storySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      requried: true,
    },

    text: {
      type: String,
      required: true,
      trim: true,
    },

    image: {
      type: String, // url of the cloudinary
      required: false,
    },

    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },

  {
    timestamps: true,
  }
);

const Story = mongoose.model("Story", storySchema);

export { Story };
