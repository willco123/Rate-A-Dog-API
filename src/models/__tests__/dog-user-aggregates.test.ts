import {
  deleteAllFromCollection,
  insertTestData,
  addUserRating,
} from "../../tests/db-test-helpers";
import {
  createMockDogs,
  createMockUrlRatings,
  createMockUsers,
} from "../../tests/test-helpers";
import connectDatabase from "../../../db-test-config";
import mongoose from "mongoose";
import * as dogModel from "../dog";
import { getUserUrls } from "../user";
import type { UrlRating, Dogs, UserDetails, UrlRatingData } from "../../types";

let db: mongoose.Connection | undefined;
let mockUrlRatings: Omit<UrlRating, "_id">[] = [];
let mockDogs: Omit<Dogs, "_id">[] = [];
let mockUsers: Omit<UserDetails, "_id">[] = [];
let userOneId: string;
let userTwoId: string;
let userThreeId: string;

beforeAll(async () => {
  db = await connectDatabase("testDogUserAggregates");
});

afterAll(async () => {
  await db?.dropDatabase();
  await db?.close();
});

beforeEach(async () => {
  try {
    mockUrlRatings = createMockUrlRatings();
    const urlRatings = await insertTestData(db, "urlratings", mockUrlRatings);
    if (!urlRatings) throw new Error("urlRatings not created");
    const ids = Object.values(
      urlRatings.insertedIds,
    ) as mongoose.Types.ObjectId[];

    mockDogs = createMockDogs(ids);
    await insertTestData(db, "dogs", mockDogs);
    mockUsers = createMockUsers();
    const users = await insertTestData(db, "users", mockUsers);
    if (!users) throw new Error("users not created");

    const { "0": userOne, "1": userTwo, "2": userThree } = users.insertedIds;
    userOneId = userOne.toString();
    userTwoId = userTwo.toString();
    userThreeId = userThree.toString();

    for (let i = 0; i < 5; i++) {
      await addUserRating(userOneId, i, mockUrlRatings[i].url);
      await addUserRating(userTwoId, i, mockUrlRatings[i + 5].url);
      await addUserRating(userThreeId, i, mockUrlRatings[i + 10].url);
    }
  } catch (error) {
    console.log(error);
  }
});

afterEach(async () => {
  jest.clearAllMocks();
  try {
    await deleteAllFromCollection(db, "dogs");
    await deleteAllFromCollection(db, "urlratings");
    await deleteAllFromCollection(db, "users");
  } catch (error) {
    console.log(error);
  }
});

async function testCatchBlock() {
  const aggregateSpy = jest
    .spyOn(mongoose.Model, "aggregate")
    .mockRejectedValue(new Error("Mocked error"));
  await expect(dogModel.aggregateRandomDocs(150)).rejects.toThrow(Error);
  aggregateSpy.mockRestore();
}

describe("MODELS DOGS USER AGGREGATES", () => {
  describe("aggregateRandomDocs, 150 urls in db", () => {
    test("aggregates with userId", async () => {
      const result = await dogModel.aggregateRandomDocs(150, userOneId);
      const resultWithMyRating: UrlRatingData[] = [];
      result.forEach((el) => {
        if (el.hasOwnProperty("myRating")) resultWithMyRating.push(el);
      });
      expect(resultWithMyRating.length).toBeGreaterThan(0);
    });
  });

  describe("aggregateAllSorted", () => {
    test("rated results", async () => {
      const result = await dogModel.aggregateAllSorted(-1, "averageRating");
      result.forEach((el) => {
        expect(el).not.toBe(0);
      });
    });
    test("number of rates", async () => {
      const result = await dogModel.aggregateAllSorted(-1, "numberOfRates");
      result.forEach((el) => {
        expect(el).not.toBe(0);
      });
    });
  });
  describe("aggregateUserSorted", () => {
    test("default sort with only user ones results", async () => {
      const userOneIds = await getUserUrls(userOneId);
      const result = await dogModel.aggregateUserSorted(userOneIds, userOneId);
      expect(result.length).toBe(5);
    });
    test("default sort with only user twos results", async () => {
      const userTwoIds = await getUserUrls(userTwoId);
      const result = await dogModel.aggregateUserSorted(userTwoIds, userTwoId);
      expect(result.length).toBe(5);
    });
    it("should throw an error if an unexpected error occurs", async () => {
      await testCatchBlock();
    });
  });
  describe("aggregateUserDataForTable", () => {
    test("User One's table data", async () => {
      const userOneIds = await getUserUrls(userOneId);
      const result = await dogModel.aggregateUserDataForTable(userOneIds);
      result.forEach((el) => {
        expect(Object.keys(el).sort()).toEqual(
          ["breed", "subBreed", "numberOfRates", "averageRating"].sort(),
        );
      });
    });
    it("should throw an error if an unexpected error occurs", async () => {
      await testCatchBlock();
    });
  });
  describe("aggreagateSingleUrl", () => {
    test("should have url rating data", async () => {
      const result = await dogModel.aggreagateSingleUrl(
        mockUrlRatings[0].url,
        userOneId,
      );
      expect(Object.keys(result).sort()).toEqual(
        ["numberOfRates", "averageRating", "myRating"].sort(),
      );
    });
    it("should throw an error if an unexpected error occurs", async () => {
      await testCatchBlock();
    });
  });
  describe("filteredCountUser", () => {
    test("should return all urls matching breed0", async () => {
      const userOneIds = await getUserUrls(userOneId);
      const result = await dogModel.filteredCountUser(
        {
          breed: mockDogs[0].breed,
          subBreed: null,
        },
        userOneIds,
      );
      expect(result).toBe(5);
    });
    test("should return none", async () => {
      const userOneIds = await getUserUrls(userOneId);
      const result = await dogModel.filteredCountUser(
        {
          breed: "Not A Breed",
          subBreed: null,
        },
        userOneIds,
      );
      expect(result).toBe(0);
    });
    it("should throw an error if an unexpected error occurs", async () => {
      await testCatchBlock();
    });
  });
});
