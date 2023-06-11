import supertest from "supertest";
import { setUpMockApp } from "../../tests/test-helpers";
import router from "../users";
import bcrypt from "bcrypt";
import * as dbUser from "../../models/user";
import * as auth from "../../middleware/auth";
import * as dbDog from "../../models/dog";

jest.mock("bcrypt");
const bcryptSaltSpy = jest.spyOn(bcrypt, "genSalt").mockImplementation(() => {
  return "salt";
});
const bcrypthashSpy = jest.spyOn(bcrypt, "hash").mockImplementation(() => {
  return "password";
});

jest.mock("../../models/dog", () => ({ deleteUserRating: jest.fn() }));

jest.mock("../../models/user", () => ({
  saveUserToDB: jest.fn().mockImplementation(() => {
    let userObj = {
      _id: "mockId",
    };
    return userObj;
  }),
  getUser: jest.fn().mockResolvedValue({ urls: ["url1", "url2"] }),
  deleteUser: jest.fn(),
}));

jest.mock("../../middleware/auth", () => ({
  authNewUser: jest.fn().mockImplementation((req, res, next) => next()),
  checkUniqueness: jest.fn().mockImplementation((req, res, next) => next()),
  isAdmin: jest.fn().mockImplementation((req, res, next) => next()),
  checkAccessToken: jest.fn().mockImplementation((req, res, next) => next()),
}));

const app = setUpMockApp();
app.use("/", router);
const newUser = {
  username: "user",
  password: "password",
  email: "email@email.com",
};

afterEach(() => {
  jest.clearAllMocks();
});

describe("USERS", () => {
  describe("POST /register", () => {
    test("should register a new user", async () => {
      const response = await supertest(app).post("/register").send(newUser);
      expect(auth.authNewUser).toBeCalled();
      expect(auth.checkUniqueness).toBeCalled();
      expect(bcryptSaltSpy).toHaveBeenCalledTimes(1);
      expect(bcrypthashSpy).toHaveBeenCalledTimes(1);
      expect(dbUser.saveUserToDB).toBeCalled();
      expect(response.text).toBe("New User added");
    });
  });
  describe("POST /admin/deleteuser", () => {
    test("should delete a user", async () => {
      const response = await supertest(app)
        .post("/admin/deleteuser")
        .send({ userId: "userID" });
      expect(auth.checkAccessToken).toBeCalled();
      expect(auth.isAdmin).toBeCalled();
      expect(dbUser.getUser).toBeCalled();
      expect(dbDog.deleteUserRating).toHaveBeenCalledTimes(2);
      expect(dbUser.deleteUser).toBeCalled();
      expect(response.text).toBe("User deleted");
    });
  });
});
