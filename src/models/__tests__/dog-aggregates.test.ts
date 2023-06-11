import {
  deleteAllFromCollection,
  insertTestData,
} from "../../tests/db-test-helpers";
import { createMockDogs, createMockUrlRatings } from "../../tests/test-helpers";
import connectDatabase from "../../../db-test-config";
import mongoose from "mongoose";
import * as dogModel from "../dog";

import type { UrlRating, Dogs } from "../../types";

let db: mongoose.Connection | undefined;
let mockUrlRatings: Omit<UrlRating, "_id">[] = [];
let mockDogs: Omit<Dogs, "_id">[] = [];

beforeAll(async () => {
  db = await connectDatabase("testDogAggregates");
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
  } catch (error) {
    console.log(error);
  }
});

afterEach(async () => {
  jest.clearAllMocks();
  try {
    await deleteAllFromCollection(db, "dogs");
    await deleteAllFromCollection(db, "urlratings");
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

describe("MODELS DOGS AGGREGATES", () => {
  describe("aggregateRandomDocs, 150 urls in db", () => {
    test("Aggregate 50 Random Docs", async () => {
      const result = await dogModel.aggregateRandomDocs(50);
      expect(result.length).toBe(50);
    });
    test("Aggregate 100 Random Docs", async () => {
      const result = await dogModel.aggregateRandomDocs(100);
      expect(result.length).toBe(100);
    });
    test("Aggregate 1 Random Docs", async () => {
      const result = await dogModel.aggregateRandomDocs(1);
      expect(result.length).toBe(1);
    });
    test("Aggregate 150 Random Docs, max count", async () => {
      const result = await dogModel.aggregateRandomDocs(150);
      expect(result.length).toBe(150);
    });
    test("Aggregate 160 Random Docs, only 150 in db", async () => {
      const result = await dogModel.aggregateRandomDocs(160);
      expect(result.length).toBe(150);
    });

    it("should throw an error if an unexpected error occurs", async () => {
      await testCatchBlock();
    });
  });
  describe("aggregateRandomWithExclusions", () => {
    test("Excluded docs should not appear in the result", async () => {
      const fiftyDocs = await dogModel.aggregateRandomDocs(50);
      const fiftyDocsWithExclusions =
        await dogModel.aggregateRandomWithExclusions(fiftyDocs, 50);

      expect(fiftyDocsWithExclusions).not.toEqual(
        expect.arrayContaining(fiftyDocs),
      );
    });
    test("aggregate all initially", async () => {
      const result = await dogModel.aggregateRandomDocs(150);
      const exclusions = await dogModel.aggregateRandomWithExclusions(
        result,
        150,
      );
      expect(exclusions.length).toBe(0);
    });
    it("should throw an error if an unexpected error occurs", async () => {
      await testCatchBlock();
    });
  });
  describe("aggregateAllSorted", () => {
    test("default sort", async () => {
      const result = await dogModel.aggregateAllSorted();
      expect(result.length).toBe(50);
    });
    test("filter for breed0 only", async () => {
      const testBreed = "breed0";
      const result = await dogModel.aggregateAllSorted(
        -1,
        "breed",
        0,
        150,
        undefined,
        { breed: testBreed, subBreed: null },
      );
      expect(result.length).toBe(5); //five urls with breed0
      expect(result[0].breed).toBe(testBreed);
    });
    it("should throw an error if an unexpected error occurs", async () => {
      await testCatchBlock();
    });
  });

  describe("aggregateDataForTable", () => {
    test("should return the correct data", async () => {
      const result = await dogModel.aggregateDataForTable();
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
  describe("countAggregate", () => {
    test("should be 200, all urls", async () => {
      const result = await dogModel.countAggregate();
      expect(result).toBe(200);
    });
    it("should throw an error if an unexpected error occurs", async () => {
      await testCatchBlock();
    });
  });
  describe("filteredCount", () => {
    test("should return all urls matching breed0", async () => {
      const result = await dogModel.filteredCount({
        breed: mockDogs[0].breed,
        subBreed: null,
      });
      expect(result).toBe(5);
    });
    test("should return none", async () => {
      const result = await dogModel.filteredCount({
        breed: "Null",
        subBreed: null,
      });
      expect(result).toBe(0);
    });
    it("should throw an error if an unexpected error occurs", async () => {
      await testCatchBlock();
    });
  });
});
