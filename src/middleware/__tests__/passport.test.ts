import "dotenv/config";
import "../passport";
import passport from "passport";
import {
  setUpMockApp,
  mockGetRouteWithMiddleware,
} from "../../tests/test-helpers";
import supertest from "supertest";
import cookieParser from "cookie-parser";
import jwtConfig from "../../utils/jwt-config";
const token = jwtConfig("testUser");
const passportMiddleware = passport.authenticate("jwt", { session: false });

const app = setUpMockApp();
app.use(cookieParser());
app.use(passport.initialize());
mockGetRouteWithMiddleware(app, passportMiddleware);

describe("PASSPORT", () => {
  test("Successful case", async () => {
    const response = await supertest(app)
      .get("/")
      .set("Cookie", [`jwt=${token}`]);
    expect(response.status).toBe(200);
  });
  test("Bad token", async () => {
    const response = await supertest(app).get("/").set("Cookie", [`jwt=123`]);
    expect(response.status).toBe(401);
  });
  test("No token", async () => {
    const response = await supertest(app).get("/");
    expect(response.status).toBe(401);
  });
});
