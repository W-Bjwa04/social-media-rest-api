import express from "express";

const router = express.Router();

import {
  registerController,
  loginController,
  logoutController,
  refetchUserController,
} from "../controllers/authController.js";

import { verifyToken } from "../middlewares/verifyToken.js";
import { uploadMultipleImages } from '../middlewares/upload.js';
// Register

router.post('/register', uploadMultipleImages, registerController);

// Login
router.route("/login").post(loginController);

//protected routes

// Logout

router.route("/logout").get(verifyToken, logoutController);

// Fetch the current user

router.route("/refetch").get(verifyToken, refetchUserController);

export default router;
