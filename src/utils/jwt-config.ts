import jwt from "jsonwebtoken";

export default function jwtConfig(userPayload: string) {
  const expirationtimeInMs = process.env.JWT_EXPIRATION_TIME;
  const secret = process.env.JWT_SECRET;

  const payload = {
    userPayload,
    expiration: Date.now() + parseInt(expirationtimeInMs!),
  };
  const token = jwt.sign(JSON.stringify(payload), secret!);
  return token;
}
