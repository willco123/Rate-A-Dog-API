import supertest from "supertest";
import { setUpMockApp } from "../../tests/test-helpers";
import router from "../login";
import { NextFunction, Request, Response } from "express";
import cookieParser from "cookie-parser";
import type { CustomRequest } from "../../middleware/auth";
import jwt from "jsonwebtoken";
import * as dbUser from "../../models/user";
import * as auth from "../../middleware/auth";

jest.mock("jsonwebtoken");
let jwtVerifySpy = jest.spyOn(jwt, "verify").mockImplementation(() => {
  return { userPayload: "decodedToken" };
});

jest.mock("../../models/user", () => ({
  deleteToken: jest.fn(),
}));

jest.mock("../../middleware/auth", () => ({
  login: jest
    .fn()
    .mockImplementation(
      (req: CustomRequest, res: Response, next: NextFunction) => {
        req.refreshToken = "refreshToken";
        req.accessToken = "accessToken";
        next();
      },
    ),
  checkAccessToken: jest.fn().mockImplementation((req: Request, res, next) => {
    next();
  }),
}));

const app = setUpMockApp();
app.use(cookieParser());
app.use("/", router);

afterEach(() => {
  jest.clearAllMocks();
});

describe("LOGIN", () => {
  describe("POST /login", () => {
    test("successful case", async () => {
      const response = await supertest(app).post("/login");
      expect(auth.login).toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(response.headers["authorization"]).toContain("accessToken");
      expect(response.headers["set-cookie"][0]).toContain("refreshToken");
      expect(response.body).toEqual({ message: "You have logged in" });
    });
  });
  describe("GET /logout", () => {
    test("Cookie exists", async () => {
      const response = await supertest(app)
        .get("/logout")
        .set("Cookie", ["refresh-token=refreshToken"])
        .set("Authorization", "accessToken");

      expect(dbUser.deleteToken).toHaveBeenCalledWith("decodedToken");
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: "You have logged out" });
      expect(response.header).not.toHaveProperty("authorization");
    });
    test("Bad token", async () => {
      jwtVerifySpy = jest.spyOn(jwt, "verify").mockImplementation(() => {
        throw new Error("invalid signature");
      });
      const response = await supertest(app)
        .get("/logout")
        .set("Cookie", ["refresh-token=badToken"]);
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Bad Token" });
    });
    test("Cookie does not exist", async () => {
      const response = await supertest(app).get("/logout");
      expect(response.status).toBe(200);
      expect(response.text).toEqual("Already logged out");
    });
  });
  describe("GET /refresh", () => {
    test("should return 200", async () => {
      const response = await supertest(app).get("/refresh");
      expect(response.status).toBe(200);
      expect(auth.checkAccessToken).toHaveBeenCalled();
    });
  });
});
