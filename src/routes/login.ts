import express from "express";
import jwt from "jsonwebtoken";
import { login } from "../middleware/auth";
import { deleteToken } from "../models/user";
import type { CustomRequest } from "../middleware/auth";
import type { JwtTokenPayload } from "../utils/token-config";
import { checkAccessToken } from "../middleware/auth";
const router = express.Router();
const secret = process.env.JWT_SECRET!;
const isDev = process.env.NODE_ENV !== "production";
const currentDomain = isDev ? "localhost" : "rateadog.onrender.com";

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
          secure: true,
          sameSite: "none",
          domain: currentDomain,
        })
        .json({
          message: "You have logged in",
        });
    } catch (err: any) {
      next(err);
    }
  },
);

router.get("/logout", async (req, res, next) => {
  try {
    const refreshToken = req.cookies["refresh-token"];
    if (!refreshToken) return res.status(200).send("Already logged out");
    const decodedToken = jwt.verify(refreshToken, secret) as JwtTokenPayload;
    const userObjectId: string = decodedToken.userPayload as string;
    await deleteToken(userObjectId);
    res.removeHeader("Authorization");
    return res.status(200).clearCookie("refresh-token").json({
      message: "You have logged out",
    });
  } catch (err: any) {
    if (err.message === "invalid signature")
      return res
        .status(400)
        .clearCookie("refresh-token")
        .send({ message: "Bad Token" });
    next(err);
  }
});

router.get(
  //this route is for when a user refreshes the page, it does not refresh the access token
  "/refresh",
  [checkAccessToken],
  async (
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    try {
      return res.status(200).send(true);
    } catch (err: any) {
      next(err);
    }
  },
);

export default router;
