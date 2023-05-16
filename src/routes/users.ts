import express from "express";
const router = express.Router();
import { saveUserToDB, deleteUser, getUser } from "../models/user";
import { deleteUserRating } from "../models/dog";
import {
  authNewUser,
  checkAccessToken,
  checkUniqueness,
  isAdmin,
} from "../middleware/auth";
import bcrypt from "bcrypt";
import { UserDetailsUi } from "../types";

router.post(
  "/register",
  [authNewUser, checkUniqueness],
  async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    try {
      const newUser: UserDetailsUi = req.body;
      const salt = await bcrypt.genSalt(10);
      const password = await bcrypt.hash(newUser.password, salt);
      newUser.password = password;
      await saveUserToDB(newUser);
      return res.status(200).send("New User added");
    } catch (err: any) {
      next(err);
    }
  },
);

router.post(
  "/admin/deleteuser",
  [checkAccessToken, isAdmin],
  async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    try {
      const userId = req.body.userId;
      // get userUrls
      const user = await getUser({ _id: userId });
      if (!user) throw new Error("User not found");
      const userUrlsIds = user.urls;
      userUrlsIds.forEach(async (urlId) => {
        await deleteUserRating(urlId, userId);
      });

      await deleteUser(userId);
    } catch (err: any) {
      next(err);
    }
  },
);

export default router;
