import {
  deleteAllFromCollection,
  getItemFromCollection,
} from "../../tests/db-test-helpers";
import connectDatabase from "../../../db-test-config";
import mongoose from "mongoose";
import type { UrlRating, Dogs } from "../../types";
import * as dogModel from "../dog";

let db: mongoose.Connection | undefined;
let mockUrlRatings: Omit<UrlRating, "_id">[] = [];
let mockDogs: Omit<Dogs, "_id">[] = [];

beforeAll(async () => {
  db = await connectDatabase("testDog");
});

afterAll(async () => {
  await db?.dropDatabase();
  await db?.close();
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

describe("MODELS DOGS", () => {
  describe("saveDogToDB", () => {
    it("should save a dog to the database", async () => {
      const breed = "test breed";
      const result = await dogModel.saveDogToDB(breed);
      expect(result).toBeDefined();
      expect(result.breed).toBe(breed);
    });
    it("shouldn't throw due to already existing breed", async () => {
      const breed = "test breed";
      const result = await dogModel.saveDogToDB(breed);
      expect(result).toBeDefined();
      expect(result.breed).toBe(breed);
    });
    it("should handle errors and throw an exception", async () => {
      const breed = "Another test breed";
      const saveDogToDBMock = jest
        .spyOn(dogModel, "saveDogToDB")
        .mockRejectedValue(new Error("Mocked error"));
      // .mockImplementation(async (): Promise<any> => {
      //   throw new Error("Mocked error");
      // });
      await expect(async () => {
        await dogModel.saveDogToDB(breed);
      }).rejects.toThrow(Error);
      saveDogToDBMock.mockRestore();
    });
  });
  describe("saveUrlWithUser", () => {
    it("should save a new UrlRating when the URL does not exist for the user", async () => {
      // Arrange
      const url = "testBreed.url";
      const userId = new mongoose.Types.ObjectId();
      const userIdString = userId.toString();

      // Act
      const result = await dogModel.saveUrlWithUser(url, userIdString);

      // Assert
      expect(result).toBeDefined();
      expect(result.url).toBe(url);
      expect(result.userRatingData).toHaveLength(1);
      expect(result.userRatingData[0].userId).toStrictEqual(userId);
    });

    it("should return the existing UrlRating when the URL already exists for the user", async () => {
      // Arrange
      const url = "testBreed.url";
      const userId = new mongoose.Types.ObjectId();
      const userIdString = userId.toString();

      // Act
      await dogModel.saveUrlWithUser(url, userIdString);
      const result = await dogModel.saveUrlWithUser(url, userIdString);

      // Assert
      expect(result).toBeDefined();
      expect(result.url).toBe(url);
      expect(result.userRatingData).toHaveLength(1);
      expect(result.userRatingData[0].userId).toStrictEqual(userId);
    });

    it("should handle errors and throw an exception", async () => {
      const url = "testBreed.url";
      const userId = "user123";
      const saveUrlWithUserMock = jest
        .spyOn(dogModel, "saveUrlWithUser")
        .mockRejectedValue(new Error("Mocked error"));
      await expect(async () => {
        await dogModel.saveUrlWithUser(url, userId);
      }).rejects.toThrow(Error);
      saveUrlWithUserMock.mockRestore();
    });
  });
  describe("deleteUserRating", () => {
    it("should delete the user rating from the dog's URL data", async () => {
      const url = "testBreed.url";
      const userId = new mongoose.Types.ObjectId();
      const userIdString = userId.toString();

      const savedUrl = await dogModel.saveUrlWithUser(url, userIdString);
      const savedDogId = savedUrl._id;

      const result = await dogModel.deleteUserRating(savedDogId, userId);
      if (!result) throw new Error("result is undefined");

      expect(result).toBeDefined();
      expect(result._id).toEqual(savedDogId);
    });

    it("should throw an error when the dog is not found", async () => {
      const dogId = new mongoose.Types.ObjectId();
      const userId = new mongoose.Types.ObjectId();
      await expect(dogModel.deleteUserRating(dogId, userId)).rejects.toThrow(
        Error,
      );
    });
  });
  describe("updateUrlRating", () => {
    it("should delete the user rating from the dog's URL data", async () => {
      const url = "testBreed.url";
      const userId = new mongoose.Types.ObjectId();
      const userIdString = userId.toString();
      const rating = 5;

      await dogModel.saveUrlWithUser(url, userIdString);

      const result = await dogModel.updateUrlRating(url, userIdString, rating);
      expect(result).toBeDefined();
      if (!result) throw new Error("result is undefined");
      expect(result).not.toBeFalsy();
      expect(result.numberOfRates).toEqual(1);
      expect(result.userRatingData).toHaveLength(1);
      expect(result.userRatingData[0].rating).toEqual(rating);
    });
    it("numberOfRates should be 1 after two rates", async () => {
      const url = "testBreed.url";
      const userId = new mongoose.Types.ObjectId();
      const userIdString = userId.toString();
      const rating = 5;
      await dogModel.saveUrlWithUser(url, userIdString);
      await dogModel.updateUrlRating(url, userIdString, rating);
      const result = await dogModel.updateUrlRating(url, userIdString, rating);
      expect(result).toBeDefined();
      if (!result) throw new Error("result is undefined");
      expect(result).not.toBeFalsy();
      expect(result.numberOfRates).toEqual(1);
    });

    it("should throw due to bad rating", async () => {
      const url = "testBreed.url";
      const userId = new mongoose.Types.ObjectId();
      const userIdString = userId.toString();
      const rating = 6;
      await dogModel.saveUrlWithUser(url, userIdString);

      await expect(
        dogModel.updateUrlRating(url, userIdString, rating),
      ).rejects.toThrow(Error);
    });
  });
  describe("saveManyUrls", () => {
    it("should save multiple URLs and return the inserted IDs", async () => {
      const urls = [
        { url: "testBreed.url" },
        { url: "testBreed2.url" },
        { url: "testBreed3.url" },
      ];
      const output = await dogModel.saveManyUrls(urls);
      expect(output.length).toEqual(3);
    });

    it("should return empty array", async () => {
      const urls = [
        { url: "testBreed.url" },
        { url: "testBreed2.url" },
        { url: "testBreed3.url" },
      ];
      await dogModel.saveManyUrls(urls);
      const result = await dogModel.saveManyUrls(urls);
      expect(result).toEqual([]);
    });
    it("should return fourth url", async () => {
      const urls = [
        { url: "testBreed.url" },
        { url: "testBreed2.url" },
        { url: "testBreed3.url" },
      ];
      await dogModel.saveManyUrls(urls);
      urls.push({ url: "testBreed4.url" });
      const result = await dogModel.saveManyUrls(urls);
      expect(result.length).toEqual(1);
    });

    it("should throw an error if an unexpected error occurs", async () => {
      const insertSpy = jest
        .spyOn(mongoose.Model, "insertMany")
        .mockRejectedValue(new Error("Mocked error"));
      const urls = [
        { url: "testBreed.url" },
        { url: "testBreed2.url" },
        { url: "testBreed3.url" },
      ];
      await expect(dogModel.saveManyUrls(urls)).rejects.toThrow(Error);
      insertSpy.mockRestore();
    });
  });

  describe("saveManyUrlIdsToDog", () => {
    it("should save multiple URL IDs to a dog", async () => {
      const breed = "test breed";
      const { id } = await dogModel.saveDogToDB(breed);

      const urlIds = [
        new mongoose.Types.ObjectId(),
        new mongoose.Types.ObjectId(),
        new mongoose.Types.ObjectId(),
      ];
      const result = await dogModel.saveManyUrlIdsToDog(urlIds, id, 0);
      const searchResult = await getItemFromCollection<Dogs>(db, "dogs", {
        _id: new mongoose.Types.ObjectId(id),
      });

      expect(result).toBeDefined();
      expect(searchResult).toBeDefined();
      if (!searchResult) throw new Error("searchResult is undefined");

      expect(searchResult.urlData[0]).toHaveLength(3);
    });
    it("should throw an error if an unexpected error occurs", async () => {
      const updateSpy = jest
        .spyOn(mongoose.Model, "updateOne")
        .mockRejectedValue(new Error("Mocked error"));

      const dogId = new mongoose.Types.ObjectId();
      const urlIds = [
        new mongoose.Types.ObjectId(),
        new mongoose.Types.ObjectId(),
        new mongoose.Types.ObjectId(),
      ];
      await expect(
        dogModel.saveManyUrlIdsToDog(urlIds, dogId, 0),
      ).rejects.toThrow();
      updateSpy.mockRestore();
    });
  });

  describe("saveSubBreedToDB", () => {
    it("should save a subbreed to the database", async () => {
      const breed = "test breed";
      const subBreed = "test subbreed";
      const { id } = await dogModel.saveDogToDB(breed);
      const result = await dogModel.saveSubBreedToDB(id, subBreed);
      expect(result).toBeDefined();
      expect(result.breed).toBe(breed);
      expect(result.subBreed[0]).toBe(subBreed);
      expect(result.urlData).toHaveLength(1);
    });
    test("save same subBreed twice, return one", async () => {
      const breed = "test breed";
      const subBreed = "test subbreed";
      const { id } = await dogModel.saveDogToDB(breed);
      await dogModel.saveSubBreedToDB(id, subBreed);
      const result = await dogModel.saveSubBreedToDB(id, subBreed);
      expect(result).toBeDefined();
      expect(result.breed).toBe(breed);
      expect(result.subBreed[0]).toBe(subBreed);
      expect(result.urlData).toHaveLength(1);
    });
    test("save two different subBreeds", async () => {
      const breed = "test breed";
      const subBreed = "test subbreed";
      const subBreedTwo = "test subbreed Two";

      const { id } = await dogModel.saveDogToDB(breed);
      await dogModel.saveSubBreedToDB(id, subBreed);
      const result = await dogModel.saveSubBreedToDB(id, subBreedTwo);
      expect(result).toBeDefined();
      expect(result.breed).toBe(breed);
      expect(result.subBreed[0]).toBe(subBreed);
      expect(result.subBreed[1]).toBe(subBreedTwo);
      expect(result.urlData).toHaveLength(2);
    });
    it("should throw an error if an unexpected error occurs", async () => {
      const updateSpy = jest
        .spyOn(mongoose.Model, "findOneAndUpdate")
        .mockRejectedValue(new Error("Mocked error"));
      const id = new mongoose.Types.ObjectId();
      const subBreed = "subBreed";
      await expect(dogModel.saveSubBreedToDB(id, subBreed)).rejects.toThrow(
        Error,
      );
      updateSpy.mockRestore();
    });
  });
});
