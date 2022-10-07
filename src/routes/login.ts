import express from "express";
const router = express.Router();
import { login } from "../middleware/auth";
import jwtConfig from "../utils/jwt-config";

router.post(
  "/login",
  [login],
  (_req: express.Request, res: express.Response) => {
    const token = jwtConfig(res.locals.userObjectId);
    res
      .status(200)
      .cookie("jwt", token, {
        httpOnly: true,
        secure: false, //--> SET TO TRUE ON PRODUCTION
      })
      .json({
        message: "You have logged in",
      });
  },
);

router.get("/logout", (req, res) => {
  if (req.cookies["jwt"]) {
    res.clearCookie("jwt").status(200).json({
      message: "You have logged out",
    });
  } else {
    res.status(401).json({
      error: "Invalid jwt",
    });
  }
});

export default router;
