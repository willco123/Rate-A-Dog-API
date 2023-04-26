import { createMockDogs } from "../../tests/test-helpers";
import {
  deleteAllFromCollection,
  insertTestData,
  getItemFromCollection,
} from "../../tests/db-test-helpers";
// import { saveDogToDB, getDogByUrlDB, getAllDogsDB, rateDogDB } from "../dog";
// import { DBDog } from "../types";

let mockDogs = createMockDogs();
let mockDog4 = { url: "url4", breed: "breed4" };

beforeEach(async () => {
  await deleteAllFromCollection("dogs");
  await insertTestData("dogs", mockDogs);
});

describe("MODELS DOGS", () => {
  // test("Truthy save & get dog", async () => {
  //   await saveDogToDB(mockDog4);
  //   let mockDog4FromDB = await getItemFromCollection<DBDog>("dogs", {
  //     url: "url4",
  //   });
  //   expect(mockDog4FromDB).toEqual(expect.objectContaining(mockDog4));
  //   mockDog4FromDB = await getDogByUrlDB(mockDog4.url);
  //   expect(mockDog4FromDB).not.toBe(null);
  // });
  // test("Falsey getDog", async () => {
  //   const mockDogFromDB = await getDogByUrlDB("no url");
  //   expect(mockDogFromDB).toBe(null);
  // });
  // test("getallDogs", async () => {
  //   const allDogs = await getAllDogsDB();
  //   expect(allDogs).not.toBe(null);
  // });
  // test("getallDogs", async () => {
  //   let mockDog4FromDB = await getItemFromCollection<DBDog>("dogs", {
  //     url: "url1",
  //   });
  //   const dogObjectId = mockDog4FromDB!._id;
  //   await rateDogDB(dogObjectId, 5);
  //   mockDog4FromDB = (await getItemFromCollection<DBDog>("dogs", {
  //     url: "url1",
  //   }))!;
  //   expect(mockDog4FromDB.rating).toEqual(5);
  // });
});
