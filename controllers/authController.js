import { User } from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { CustomError } from "../middlewares/error.middlewares.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../config/cloudinary.js";

const registerController = async (req, res, next) => {
  let uploadedImageIds = [];

  try {
    const { username, password, email, fullName, bio, imageTypes } = req.body;

    if (!username || !password || !email) {
      throw new CustomError("Username, password, and email are required", 400);
    }

    const existingUser = await User.findOne({
      $or: [{ username }, { email }],
    });
    if (existingUser) {
      throw new CustomError("Username or email is already registered", 409);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userData = {
      username,
      password: hashedPassword,
      email,
      fullName,
      bio,
    };

    if (req.files && req.files.length > 0) {
      if (req.files.length > 2) {
        throw new CustomError("Maximum 2 images allowed", 400);
      }

      const validImageTypes = ["profile", "cover"];

      // Normalize imageTypes to an array
      let types = [];
      if (Array.isArray(imageTypes)) {
        types = imageTypes;
      } else if (typeof imageTypes === "string") {
        types = [imageTypes]; // single image type (like "cover")
      }

      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];

        const type =
          types[i] && validImageTypes.includes(types[i].toLowerCase())
            ? types[i].toLowerCase()
            : i === 0
              ? "profile"
              : "cover";

        const uploadResult = await uploadOnCloudinary(file.path);

        if (!uploadResult) {
          throw new CustomError("Image upload failed", 500);
        }

        uploadedImageIds.push(uploadResult.public_id);

        if (type === "profile") {
          userData.profilePicture = uploadResult.secure_url;
          userData.profilePictureId = uploadResult.public_id;
        } else if (type === "cover") {
          userData.coverPicture = uploadResult.secure_url;
          userData.coverPictureId = uploadResult.public_id;
        }
      }
    }

    const newUser = new User(userData);
    await newUser.save();

    const userResponse = await User.findById(newUser._id).select("-password");

    return res.status(201).json({
      message: "User created successfully",
      user: userResponse,
    });
  } catch (error) {
    for (const publicId of uploadedImageIds) {
      await deleteFromCloudinary(publicId);
    }

    console.error("Registration error:", error.message);
    next(error);
  }
};

export default registerController;

const loginController = async (req, res, next) => {
  try {
    // Get data from the request body
    const { username, email, password } = req.body;

    // Validate required fields
    if (!password || (!username && !email)) {
      throw new CustomError(
        "Password and either username or email are required",
        404
      );
    }

    // Find user by email or username
    let user;
    if (email) {
      user = await User.findOne({ email });
    } else if (username) {
      user = await User.findOne({ username });
    }

    // Check if user exists
    if (!user) {
      throw new CustomError("User not found", 404);
    }

    // Verify password
    const isPasswordMatched = await bcrypt.compare(password, user.password);
    if (!isPasswordMatched) {
      throw new CustomError("Invalid password", 404);
    }

    // Fetch sanitized user (exclude password)
    const sanitizedUser = await User.findOne({
      _id: user._id,
    }).select("-password");

    // create the jet token for authetication

    const jwtToken = await jwt.sign(
      { _id: sanitizedUser._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );
    // store the jwt token in the cookie
    res.cookie("token", jwtToken).status(201).json({
      message: "Login successful",
      user: sanitizedUser,
    });
  } catch (error) {
    next(error);
  }
};

const logoutController = async (req, res, next) => {
  try {
    // clear the token cookie
    return res
      .clearCookie("token", {
        sameSite: "none", // allow the cross origin request
        secure: true, // only over the http request
      })
      .status(200)
      .json({
        message: "Logout Successfull",
      });
  } catch (error) {
    next(error);
  }
};

const refetchUserController = async (req, res, next) => {
  // get the token from the cookies

  const { token } = req.cookies;

  if (!token) {
    throw new CustomError("Token not found in cookies", 404);
  }

  try {
    // verify the jwt token
    jwt.verify(token, process.env.JWT_SECRET, {}, async (err, data) => {
      // if the token is tampered
      if (err) {
        return res.status(500).json(err);
      }

      // if token is not tempered then refetch the user

      try {
        const user = await User.findById({
          _id: data._id,
        }).select("-password");

        return res.status(200).json({
          message: "User fetched successfully",
          // Suggested code may be subject to a license. Learn more: ~LicenseLog:2973892564.
          user,
        });
      } catch (error) {
        next(error);
      }
    });
  } catch (error) {
    next(error);
  }
};

export {
  registerController,
  loginController,
  logoutController,
  refetchUserController,
};
