import { createMockUsers } from "../../tests/test-helpers";
import {
  deleteAllFromCollection,
  insertTestData,
} from "../../tests/db-test-helpers";
import { saveUserToDB, getAllUsersFromDB, getUser } from "../user";

let mockUsers = createMockUsers();
let mockUser4 = {
  username: "mockUser4",
  password: "mockPass4",
  email: "mockEmail4@gmail.com",
};

beforeEach(async () => {
  await deleteAllFromCollection("users");
  await insertTestData("users", mockUsers);
});

describe("MODELS USERS", () => {
  test("Check user has correct keys", async () => {
    const allFromCollection: any = await getAllUsersFromDB();
    const userKeys = Object.keys(allFromCollection[0].toJSON());
    expect(userKeys).toEqual(
      expect.arrayContaining(["rank", "_id", "username", "password", "email"]),
    );
  });
  test("Check user matches input values", async () => {
    const allFromCollection: any = await getAllUsersFromDB();
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
    await deleteAllFromCollection("users");
    const allFromCollection = await getAllUsersFromDB();
    expect(allFromCollection.length).toBe(0);
  });
  test("Get a User", async () => {
    const aUser: any = await getUser({ username: "mockUser1" });
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
    const aUser = await getUser({ username: "mockUserUnknown" });
    expect(aUser).toBe(null);
  });

  test("Save User to DB", async () => {
    await saveUserToDB(mockUser4);
    const aUser = await getUser({ username: "mockUser4" });
    expect(aUser).not.toBe(null);
  });

  test("Save User to DB Duplicate User", async () => {
    await expect(async () => {
      await saveUserToDB(mockUsers[0]);
    }).rejects.toThrow(Error);
  });
});
