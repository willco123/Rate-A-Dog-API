import { createMockUsers } from "../../tests/test-helpers";
import {
  deleteAllFromCollection,
  insertTestData,
} from "../../tests/db-test-helpers";
import type { UserDetails } from "../../types";
import connectDatabase from "../../../db-test-config";
import mongoose from "mongoose";
import * as userModel from "../user";

let mockUsers: Omit<UserDetails, "_id">[] = [];
let userOneId: string;
let userTwoId: string;
let userThreeId: string;
let mockUser4 = {
  username: "mockUser4",
  password: "mockPass4",
  email: "mockEmail4@gmail.com",
};
let db: mongoose.Connection | undefined;

beforeAll(async () => {
  db = await connectDatabase("testDogUser");
});

afterAll(async () => {
  await db?.dropDatabase();
  await db?.close();
});

beforeEach(async () => {
  try {
    mockUsers = createMockUsers();
    const users = await insertTestData(db, "users", mockUsers);
    if (!users) throw new Error("users not created");
    const { "0": userOne, "1": userTwo, "2": userThree } = users.insertedIds;
    userOneId = userOne.toString();
    userTwoId = userTwo.toString();
    userThreeId = userThree.toString();
  } catch (error) {
    console.log(error);
  }
});

afterEach(async () => {
  jest.clearAllMocks();
  try {
    await deleteAllFromCollection(db, "users");
  } catch (error) {
    console.log(error);
  }
});

describe("MODELS USERS", () => {
  test("Check user has correct keys", async () => {
    const allFromCollection: any = await userModel.getAllUsersFromDB();
    const userKeys = Object.keys(allFromCollection[0].toJSON());
    expect(userKeys).toEqual(
      expect.arrayContaining(["rank", "_id", "username", "password", "email"]),
    );
  });
  test("Check user matches input values", async () => {
    const allFromCollection: any = await userModel.getAllUsersFromDB();
    const userValues = Object.values(allFromCollection[0].toJSON());
    expect(userValues).toEqual(
      expect.arrayContaining([
        "mockUser1",
        "mockPass1",
        "mockEmail1@gmail.com",
      ]),
    );
  });
  test("Should recieve an empty array", async () => {
    await deleteAllFromCollection(db, "users");
    const allFromCollection = await userModel.getAllUsersFromDB();
    expect(allFromCollection.length).toBe(0);
  });
  test("Get a User", async () => {
    const aUser: any = await userModel.getUser({ username: "mockUser1" });
    const userValues = Object.values(aUser!.toJSON());
    expect(userValues).toEqual(
      expect.arrayContaining([
        "mockUser1",
        "mockPass1",
        "mockEmail1@gmail.com",
      ]),
    );
  });
  test("No user found", async () => {
    const aUser = await userModel.getUser({ username: "mockUserUnknown" });
    expect(aUser).toBe(null);
  });

  test("Save User to DB", async () => {
    await userModel.saveUserToDB(mockUser4);
    const aUser = await userModel.getUser({ username: "mockUser4" });
    expect(aUser).not.toBe(null);
  });

  test("Save User to DB Duplicate User", async () => {
    const mockUser0Dup = {
      username: "mockUser1",
      password: "mockPass1",
      email: "mockEmail1@gmail.com",
    };
    await expect(async () => {
      await userModel.saveUserToDB(mockUser0Dup);
    }).rejects.toThrow(Error);
  });
  test("delete User", async () => {
    await userModel.deleteUser(userTwoId);
    const aUser = await userModel.getUser({ username: "mockUser2" });
    expect(aUser).not.toBeDefined;
  });
  test("token functions", async () => {
    const testToken = "testToken";
    await userModel.saveToken(testToken, userOneId);
    const token = await userModel.getToken(userOneId);
    expect(token).toBeDefined;
    await userModel.deleteToken(userOneId);
    expect(token).not.toBeDefined;
  });
});
