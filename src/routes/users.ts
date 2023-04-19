import express from "express";
const router = express.Router();
import { saveUserToDB } from "../models/user";
import { authNewUser, checkUniqueness } from "../middleware/auth";
import bcrypt from "bcrypt";
import { UserDetails } from "./types";

router.post(
  "/register",
  [authNewUser, checkUniqueness],
  async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    try {
      const newUser: UserDetails = req.body;
      const salt = await bcrypt.genSalt(10);
      const password = await bcrypt.hash(newUser.password, salt);
      newUser.password = password;
      const user = await saveUserToDB(newUser);

      return res.status(200).send("New User added");
    } catch (err: any) {
      next(err);
    }
  },
);

export default router;
