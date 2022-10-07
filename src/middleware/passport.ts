import passport from "passport";
import { Request } from "express";
import passportJWT from "passport-jwt";
const JWTStrategy = passportJWT.Strategy;

const secret = process.env.JWT_SECRET;

const cookieExtractor = (req: Request) => {
  return req && req.cookies ? req.cookies["jwt"] : null;
};

passport.use(
  "jwt",
  new JWTStrategy(
    {
      jwtFromRequest: cookieExtractor,
      secretOrKey: secret,
    },
    (jwtPayload, done) => {
      const { expiration } = jwtPayload;
      if (Date.now() > expiration) {
        done("Unauthorized", false);
      }

      done(null, jwtPayload);
    },
  ),
);
