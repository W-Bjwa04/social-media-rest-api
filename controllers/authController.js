import { User } from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { CustomError } from "../middlewares/error.middlewares.js";

const registerController = async (req, res, next) => {
  try {
    // get the data from the req body

    const data = req.body;

    const { username, password, email } = data;

    // check for the existing user

    const existingUser = await User.findOne({
      $or: [{ username }, { email }], // check for both username and email
    });

    if (existingUser) {
      throw new CustomError("Username or email is already regisatered", 404);
    }

    const salt = await bcrypt.genSalt(10); // 10 are the no. of iterations
    const hashPassword = await bcrypt.hashSync(password, salt);

    const newIUsewr = User({
      ...req.body,
      password: hashPassword,
    });

    await newIUsewr.save();

    const verifyUser = await User.findOne({
      username,
    });

    if (!verifyUser) {
      throw new CustomError("User cannot be saved to the database", 404);
    }
    return res.status(201).json({
      message: "User Created Successfully",
      user: verifyUser,
    });
  } catch (error) {
    next(error);
  }
};

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
