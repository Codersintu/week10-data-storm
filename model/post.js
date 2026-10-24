
import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    image:{
      type: String,
      required: false,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    }
  },
  {
    timestamps: true,
    strict: true,
  }
);

const Post = mongoose.model("Post", postSchema);

export default Post;
