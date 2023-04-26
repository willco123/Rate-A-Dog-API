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
import type { UserDetails, Login } from "./types";
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
  const accessToken = generateAccessToken(userId); //should this really use userId?

  req.accessToken = accessToken;
  req.refreshToken = refreshToken;

  next();
};

//needs refactoring
export const checkAccessToken: RequestHandler = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"];
    if (!accessToken) return checkRefreshToken(req, res, next);
    const decodedToken = jwt.verify(accessToken, secret) as JwtTokenPayload;
    const expiration = decodedToken.expiration;

    if (Date.now() > expiration) return checkRefreshToken(req, res, next);
    req.body.userId = decodedToken.userPayload;
    next();
  } catch (err: any) {
    if ((err.message = "invalid signature"))
      return res.status(400).clearCookie("refresh-token").send("Bad Token");

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

    if (!refreshToken) {
      return res.status(402).send("Unauthorized, please log in");
    }

    const decodedToken = jwt.verify(refreshToken, secret) as JwtTokenPayload;
    const userObjectId: string = decodedToken.userPayload as string;
    const { expiration } = decodedToken;

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

    const accessToken = generateAccessToken(decodedToken.userPayload);
    res.setHeader("Authorization", accessToken);
    req.body.userId = decodedToken.userPayload;
    next();
  } catch (err: any) {
    if ((err.message = "invalid signature"))
      return res.status(400).clearCookie("refresh-token").send("Bad Token");
    next(err);
  }
};

export function decodeToken(token: string) {
  const decodedToken = jwt.verify(token, secret) as JwtTokenPayload;
  const expiration = decodedToken.expiration;
  if (Date.now() > expiration) return undefined;

  return decodedToken.userPayload;
}

//maybe require both refresh and access tokens to be present to allow access, currently
//only access token is required (although it is a short-lived token with no user info in payload)
