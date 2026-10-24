
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "node:dns";
import cors from "cors";
import { v2 as cloudinary } from 'cloudinary'
import multer from "multer";

import Post from "./model/post.js";

dotenv.config();

dns.setServers(["1.1.1.1", "1.0.0.1"]);

const app = express();

app.use(express.json());
app.use(cors({ origin: "https://week11-project-ashy.vercel.app" }));

const uploadPostImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
}).single("image");

const parsePostImage = (req, res, next) => {
  uploadPostImage(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError) {
      return res.status(400).json({ message: error.message });
    }

    console.error("Failed to process post image:", error);
    return res.status(500).json({ message: "Failed to process image upload" });
  });
};

cloudinary.config({ 
  secure: true,
  cloud_name: process.env.cloud_name, 
  api_key: process.env.api_key, 
  api_secret: process.env.api_secret
});



app.get("/", (req, res) => {
  res.send("Blog API is running");
});

// Create a user

// app.post("/users", async (req, res) => {
//   try {
//     const { name, email } = req.body;

//     const user = await User.create({ name, email });

//     res.status(201).json({
//       message: "User created successfully",
//       user,
//     });
//   } catch (error) {
//     if (error.code === 11000) {
//       return res.status(409).json({
//         message: "Email already exists",
//       });
//     }

//     if (error.name === "ValidationError") {
//       return res.status(400).json({
//         message: error.message,
//       });
//     }

//     res.status(500).json({
//       message: "Failed to create user",
//     });
//   }
// });



// Create a post
app.post("/posts", parsePostImage, async (req, res) => {
  try {
    const { title, content } = req.body;
    const imageUrl = req.file
      ? await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { folder: "blog_images" },
            (error, result) => {
              if (error) {
                return reject(error);
              }

              if (!result?.secure_url) {
                return reject(new Error("Cloudinary did not return a secure URL"));
              }

              resolve(result.secure_url);
            }
          );
          uploadStream.end(req.file.buffer);
        })
      : undefined;

    const post = await Post.create({
      title,
      content,
      image: imageUrl,
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

    console.error("Failed to create post:", error);
    res.status(500).json({
      message: "Failed to create post",
    });
  }
});

// Get all posts and populate their authors
app.get("/posts", async (req, res) => {
  try {
    const posts = await Post.find()
     
     
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
      .populate( "name email")
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
