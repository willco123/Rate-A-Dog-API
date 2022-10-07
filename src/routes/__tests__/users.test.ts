import supertest from "supertest";
import { setUpMockApp } from "../../tests/test-helpers";
import router from "../users";
import bcrypt from "bcrypt";
import * as userQueries from "../../models/user";
import * as favouriteQueries from "../../models/favourite";

jest.mock("bcrypt");
const bcryptSaltSpy = jest.spyOn(bcrypt, "genSalt").mockImplementation(() => {
  return "salt";
});
const bcrypthashSpy = jest.spyOn(bcrypt, "hash").mockImplementation(() => {
  return "password";
});

jest.mock("../../models/user", () => ({
  saveUserToDB: jest.fn().mockImplementation(() => {
    let userObj = {
      _id: "mockId",
    };
    return userObj;
  }),
}));

jest.mock("../../models/favourite", () => ({
  createFavouriteDoc: jest.fn(),
}));

jest.mock("../../middleware/auth", () => ({
  authNewUser: jest.fn().mockImplementation((req, res, next) => next()),
  checkUniqueness: jest.fn().mockImplementation((req, res, next) => next()),
}));

const app = setUpMockApp();
app.use("/users", router);
const newUser = {
  username: "user",
  password: "password",
  email: "email@email.com",
};

afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

describe("USERS", () => {
  test("successful case", async () => {
    const response = await supertest(app).post("/users").send(newUser);
    expect(bcryptSaltSpy).toHaveBeenCalledTimes(1);
    expect(bcrypthashSpy).toHaveBeenCalledTimes(1);
    expect(userQueries.saveUserToDB).toBeCalled();
    expect(response.text).toBe("New User added");
  });
});
