import { RequestHandler, Request } from "express";
import { validateNewUser } from "../utils/validators";
import { deleteToken, getUser } from "../models/user";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { JwtTokenPayload } from "../utils/token-config";
import { getToken } from "../models/user";
import {
  generateRefreshToken,
  generateAccessToken,
} from "../utils/token-config";
const secret = process.env.JWT_SECRET!;

export interface CustomRequest extends Request {
  accessToken?: string;
  refreshToken?: string;
}

export const authNewUser: RequestHandler = (req, res, next) => {
  const newUser: UserDetails = req.body;
  const { error } = validateNewUser(newUser);
  if (error) return res.status(401).send(error.details[0].message);
  next();
};

export const checkUniqueness: RequestHandler = async (req, res, next) => {
  const { username, email } = req.body;
  if (await getUser({ username: username }))
    return res.status(401).send("That Username is taken");
  if (await getUser({ email: email }))
    return res.status(401).send("That Email is taken");
  next();
};

export const login: RequestHandler = async (req: CustomRequest, res, next) => {
  const { username, password }: Login = req.body;
  const user = await getUser({ username: username });
  if (!user) return res.status(401).send("Username or Password is incorrect");
  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword)
    return res.status(401).send("Username or Password is incorrect");
  const userId = user._id as unknown as string; //fix this

  const refreshToken = await generateRefreshToken(userId);
  const accessToken = generateAccessToken(true);

  req.accessToken = accessToken;
  req.refreshToken = refreshToken;

  next();
};

export const checkAccessToken: RequestHandler = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"];

    if (!accessToken) return checkRefreshToken(req, res, next);
    const decondedToken = jwt.verify(accessToken, secret) as JwtTokenPayload;
    const expiration = decondedToken.expiration;

    if (Date.now() > expiration) return checkRefreshToken(req, res, next);
    next();
  } catch (err: any) {
    if ((err.message = "invalid signature")) res.status(401).send("Bad Token");

    next(err);
  }
};

export const checkRefreshToken: RequestHandler = async (
  req: CustomRequest,
  res,
  next,
) => {
  try {
    const refreshToken = req.cookies["refresh-token"];
    if (!refreshToken)
      return res.status(401).send("Unauthorized, please log in");
    const decondedToken = jwt.verify(refreshToken, secret) as JwtTokenPayload;
    const userObjectId: string = decondedToken.userPayload as string;
    const { expiration } = decondedToken;

    if (Date.now() > expiration) {
      await deleteToken(userObjectId);
      return res.status(401).send("Unauthorized, please log in");
    }

    const refreshTokenFromDB = await getToken(userObjectId);
    if (refreshTokenFromDB === null)
      return res.status(401).send("No user found, please register");
    if (refreshTokenFromDB === undefined)
      return res.status(401).send("Unauthorized");
    if (refreshTokenFromDB !== refreshToken)
      return res.status(401).send("Unauthorized");

    const accessToken = generateAccessToken(true);
    res.setHeader("Authorization", accessToken);
    next();
  } catch (err) {
    next(err);
  }
};
