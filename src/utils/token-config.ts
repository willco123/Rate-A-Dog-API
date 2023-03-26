import jwt from "jsonwebtoken";
import { saveToken } from "../models/user";

export type JwtTokenPayload = {
  userPayload: string;
  expiration: number;
  refresh?: boolean;
  access?: boolean;
};

export async function generateRefreshToken(userPayload: string) {
  const expirationtimeInMs = process.env.REFRESH_TOKEN_EXPIRATION_TIME;
  const secret = process.env.JWT_SECRET;
  const payload: JwtTokenPayload = {
    userPayload,
    expiration: Date.now() + parseInt(expirationtimeInMs!),
    refresh: true,
  };
  const token = jwt.sign(JSON.stringify(payload), secret!);
  await saveToken(token, userPayload);
  return token;
}

export function generateAccessToken(userPayload: string) {
  const expirationtimeInMs = process.env.ACCESS_TOKEN_EXPIRATION_TIME;
  const secret = process.env.JWT_SECRET;

  const payload: JwtTokenPayload = {
    userPayload,
    expiration: Date.now() + parseInt(expirationtimeInMs!),
    access: true,
  };
  const token = jwt.sign(JSON.stringify(payload), secret!);
  return token;
}

//need to handle env values, maybe parse them during startup to ensure they are configured
