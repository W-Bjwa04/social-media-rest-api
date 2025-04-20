import express from "express";

const router = express.Router();

import {
  getUserController,
  updateUserController,
  followUserController,
  unfollowUserController,
  blockUserController,
  unblockUserController,
  getBlockListController,
  deleteUserController,
  searchUserController,
} from "../controllers/userContoller.js";

import { verifyToken } from "../middlewares/verifyToken.js";

// protected routes (user needs to be login first )

// get user details

router.route("/:userid").get(verifyToken, getUserController);

// update user route

router.route("/update/:userid").put(verifyToken, updateUserController);

// follow the user

router.route("/follow/:userid").get(verifyToken, followUserController);

//unfollow the user

router.route("/unfollow/:userid").get(verifyToken, unfollowUserController);

//block the user

router.route("/block/:userid").get(verifyToken, blockUserController);

//unblock the user

router.route("/unblock/:userid").get(verifyToken, unblockUserController);

//get block list

router.route("/get/blocklist").get(verifyToken, getBlockListController);

// delete the user profile

router.route("/delete/:userid").delete(verifyToken, deleteUserController);

// search the user profile

router.route("/search/:query").get(searchUserController);

export default router;
