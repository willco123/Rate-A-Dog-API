import passport from "passport";
import { Request } from "express";
import passportJWT, { ExtractJwt } from "passport-jwt";
const JWTStrategy = passportJWT.Strategy;

const secret = process.env.JWT_SECRET;

const cookieExtractor = (req: Request) => {
  return req && req.cookies ? req.cookies["refresh-token"] : null;
};

passport.use(
  "refresh-token",
  new JWTStrategy(
    {
      jwtFromRequest: cookieExtractor,
      secretOrKey: secret,
    },
    (jwtPayload, done) => {
      const { expiration } = jwtPayload;
      console.log("first");
      console.log(jwtPayload);
      if (Date.now() > expiration) {
        return done("Unauthorized", false);
      }

      return done(null, jwtPayload);
    },
  ),
);

passport.use(
  "access-token",
  new JWTStrategy(
    {
      jwtFromRequest: ExtractJwt.fromHeader("authorization"),
      secretOrKey: secret,
    },
    (jwtPayload, done) => {
      const { expiration } = jwtPayload;
      if (Date.now() > expiration) {
        return done("Unauthorized", false);
      }
      return done(null, jwtPayload);
    },
  ),
);

//failed auth causes XML Parsing Error: syntax error,
//setting content-type can fix but not sure how to set through passport
//maybe with custom callback func
//seems to be a firefox exclusive error

const passportMiddleware = passport.authenticate("jwt", { session: false });
