import express from "express";
import jwt from "jsonwebtoken";
import { login } from "../middleware/auth";
import { deleteToken } from "../models/user";
import type { CustomRequest } from "../middleware/auth";
import type { JwtTokenPayload } from "../utils/token-config";
const router = express.Router();
const secret = process.env.JWT_SECRET!;

router.post(
  "/login",
  [login],
  (req: CustomRequest, res: express.Response, next: express.NextFunction) => {
    try {
      const refreshToken = req.refreshToken;
      const accessToken = req.accessToken;

      if (refreshToken === undefined || accessToken === undefined)
        return res.status(500).send("Error in generating tokens");
      return res
        .status(200)
        .setHeader("Authorization", accessToken)
        .cookie("refresh-token", refreshToken, {
          httpOnly: true,
          secure: true, //--> SET TO TRUE ON PRODUCTION
          sameSite: "strict",
        })
        .json({
          message: "You have logged in",
        });
    } catch (err: any) {
      next(err);
    }
  },
);

router.get("/logout", async (req, res) => {
  try {
    const refreshToken = req.cookies["refresh-token"];
    if (!refreshToken) return res.status(200).send("Already logged out");
    const decondedToken = jwt.verify(refreshToken, secret) as JwtTokenPayload;
    const userObjectId: string = decondedToken.userPayload as string;
    await deleteToken(userObjectId);
    res.removeHeader("Authorization");
    return res.status(200).clearCookie("refresh-token").json({
      message: "You have logged out",
    });
  } catch (err: any) {
    throw new err();
  }
});

export default router;

//need to test for expired refresh token
