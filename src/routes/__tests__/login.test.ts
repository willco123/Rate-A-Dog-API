import supertest from "supertest";
import { setUpMockApp } from "../../tests/test-helpers";
import router from "../login";
import { NextFunction, Request, Response } from "express";
import cookieParser from "cookie-parser";

jest.mock("passport", () => ({
  authenticate: jest.fn((_, __) => {
    return (___: Request, ____: Response, next: NextFunction) => {
      next();
    };
  }),
}));

jest.mock("../../utils/jwt-config", () =>
  jest.fn().mockImplementation(() => "token"),
);

jest.mock("../../middleware/auth", () => ({
  login: jest
    .fn()
    .mockImplementation((_req: Request, res: Response, next: NextFunction) => {
      res.locals.user = "test";
      next();
    }),
}));

const app = setUpMockApp();
app.use(cookieParser());
app.use("/", router);

afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

describe("LOGIN", () => {
  describe("/LOGIN", () => {
    test("successful case", async () => {
      const response = await supertest(app).post("/login");
      expect(response.status).toBe(200);
      expect(response.headers["set-cookie"][0]).toContain("jwt=token");
      expect(response.body).toEqual({ message: "You have logged in" });
    });
  });
  describe("/LOGOUT", () => {
    test("Cookie exists", async () => {
      const response = await supertest(app)
        .get("/logout")
        .set("Cookie", ["jwt=token"]);
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: "You have logged out" });
    });
    test("Cookie does not exist", async () => {
      const response = await supertest(app).get("/logout").set("Cookie", [""]);
      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: "Invalid jwt" });
    });
  });
});
