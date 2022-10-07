import {
  deleteAllFromCollection,
  getItemFromCollection,
  insertTestData,
} from "../../tests/db-test-helpers";
import {
  createFavouriteDoc,
  saveFavouriteToDB,
  deleteFavouriteDog,
  getFavourites,
} from "../favourite";
import { DBFavourites, DBUserDetails, DBDog } from "../types";
import { createMockDogs, createMockUsers } from "../../tests/test-helpers";
import { saveDogToDB } from "../dog";
let mockDogs = createMockDogs();
let mockUsers = createMockUsers();

beforeAll(async () => {
  await deleteAllFromCollection("users");
  await insertTestData("users", mockUsers);
  await deleteAllFromCollection("dogs");
  for (let i in mockDogs) {
    saveDogToDB(mockDogs[i]);
  }
});

beforeEach(async () => {
  await deleteAllFromCollection("favourites");
});

describe("MODELS FAVOURITES", () => {
  test("Test all functions, successful tests", async () => {
    let firstUser = await getItemFromCollection<DBUserDetails>("users", {
      username: "mockUser1",
    });
    const firstDog = await getItemFromCollection<DBDog>("dogs", {
      url: "url1",
    });
    const firstUserId = firstUser!._id;
    const firstDogId = firstDog!._id;
    await createFavouriteDoc(firstUserId);
    let firstUserFavouriteDoc = await getItemFromCollection<DBFavourites>(
      "favourites",
      {
        user: firstUserId,
      },
    );
    expect(firstUserFavouriteDoc).not.toBe(null);

    await saveFavouriteToDB(firstUserId, firstDogId);
    firstUserFavouriteDoc = await getItemFromCollection<DBFavourites>(
      "favourites",
      {
        user: firstUserId,
      },
    );
    expect(firstUserFavouriteDoc!.dogs).toEqual(
      expect.arrayContaining([firstDogId]),
    );

    const populatedFavourites = await getFavourites(firstUserId);
    expect(populatedFavourites!).toEqual(
      expect.arrayContaining([expect.objectContaining(mockDogs[0])]),
    );

    await deleteFavouriteDog(firstUserId, firstDogId);
    firstUserFavouriteDoc = await getItemFromCollection<DBFavourites>(
      "favourites",
      {
        user: firstUserId,
      },
    );
    expect(firstUserFavouriteDoc!.dogs).toEqual([]);
  });
  test("Duplicate dog and user", async () => {
    const firstUser = await getItemFromCollection<DBUserDetails>("users", {
      username: "mockUser1",
    });
    const firstDog = await getItemFromCollection<DBDog>("dogs", {
      url: "url1",
    });
    const firstUserId = firstUser!._id;
    const firstDogId = firstDog!._id;
    await createFavouriteDoc(firstUserId);

    await expect(async () => {
      await createFavouriteDoc(firstUserId);
    }).rejects.toThrow();

    await saveFavouriteToDB(firstUserId, firstDogId);
    await saveFavouriteToDB(firstUserId, firstDogId);
    let firstUserFavouriteDoc = await getItemFromCollection<DBFavourites>(
      "favourites",
      {
        user: firstUserId,
      },
    );
    expect(firstUserFavouriteDoc!.dogs.length).toEqual(1);
  });
});
