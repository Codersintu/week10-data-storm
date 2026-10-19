
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "node:dns";

import Post from "./model/post.js";
import User from "./model/user.js";

dotenv.config();

dns.setServers(["1.1.1.1", "1.0.0.1"]);

const app = express();

app.use(express.json());


app.get("/", (req, res) => {
  res.send("Blog API is running");
});

// Create a user
app.post("/users", async (req, res) => {
  try {
    const { name, email } = req.body;

    const user = await User.create({ name, email });

    res.status(201).json({
      message: "User created successfully",
      user,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Email already exists",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: error.message,
      });
    }

    res.status(500).json({
      message: "Failed to create user",
    });
  }
});

// Create a post
app.post("/posts", async (req, res) => {
  try {
    const { title, content, authorId } = req.body;

    if (!mongoose.isValidObjectId(authorId)) {
      return res.status(400).json({
        message: "A valid authorId is required",
      });
    }

    const author = await User.findById(authorId);

    if (!author) {
      return res.status(404).json({
        message: "Author not found",
      });
    }

    const post = await Post.create({
      title,
      content,
      authorId,
    });

    res.status(201).json({
      message: "Post created successfully",
      post,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: error.message,
      });
    }

    res.status(500).json({
      message: "Failed to create post",
    });
  }
});

// Get all posts and populate their authors
app.get("/posts", async (req, res) => {
  try {
    const posts = await Post.find()
      .populate("authorId", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: posts.length,
      posts,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch posts",
    });
  }
});

// Get the three most recent posts
app.get("/posts/recent", async (req, res) => {
  try {
    const posts = await Post.find()
      .populate("authorId", "name email")
      .sort({ createdAt: -1 })
      .limit(3);

    res.status(200).json({
      count: posts.length,
      posts,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch recent posts",
    });
  }
});

// Delete a post
app.delete("/posts/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid post ID",
      });
    }

    const post = await Post.findByIdAndDelete(id);

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    res.status(200).json({
      message: "Post deleted successfully",
      post,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete post",
    });
  }
});

// Connect to MongoDB before starting the server
async function startServer() {
  try {
    await mongoose.connect(process.env.MONGODB_URL);

    console.log("Connected to MongoDB");

    const PORT = process.env.PORT || 8000;

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error.message);
    process.exit(1);
  }
}

startServer();
