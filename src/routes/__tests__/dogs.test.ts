import supertest from "supertest";
import { setUpMockApp, createMockDogs } from "../../tests/test-helpers";
import router from "../dogs";
import { NextFunction, Request, Response } from "express";
import cookieParser from "cookie-parser";
import * as dogQueries from "../../models/dog";
import * as dogApi from "../../services/dog-api";
import _ from "lodash";

const mockDogs = createMockDogs();

jest.mock("../../models/dog", () => ({
  getAllDogsDB: jest.fn().mockImplementation(() => {
    return mockDogs;
  }),
  getDogByUrlDB: jest.fn().mockImplementation(() => {
    let mockDogFromDB = _.assign(mockDogs[0], { _id: "id" });
    return mockDogFromDB;
  }),
  saveDogToDB: jest.fn().mockImplementation(() => {
    let mockDogFromDB = _.assign(mockDogs[0], { _id: "id" });
    return mockDogFromDB;
  }),
  rateDogDB: jest.fn(),
}));

jest.mock("../../services/dog-api", () => ({
  getRandomDog: jest.fn(),
  isBreed: jest.fn().mockImplementation((__: string, ___?: string) => {
    return true;
  }),
  getDogByBreed: jest.fn().mockImplementation((__: string, ___: string) => {
    return "A dog";
  }),
}));

jest.mock("passport", () => ({
  authenticate: jest.fn((_, __) => {
    return (___: Request, ____: Response, next: NextFunction) => {
      next();
    };
  }),
}));

jest.mock("../../middleware/auth", () => ({
  login: jest
    .fn()
    .mockImplementation((_req: Request, res: Response, next: NextFunction) => {
      next();
    }),
}));

let myMock: jest.SpyInstance;

const app = setUpMockApp();
app.use(cookieParser());
app.use("/dogs", router);

afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

describe("ROUTES DOGS", () => {
  describe("/random", () => {
    test("Get Random", async () => {
      const response = await supertest(app).get("/dogs/random");
      expect(dogApi.getRandomDog).toBeCalled();
      expect(response.statusCode).toBe(200);
    });
  });
  describe("/breed", () => {
    test("Get Breed", async () => {
      const response = await supertest(app)
        .get("/dogs/breed")
        .send({ breed: "breed", subBreed: "subBreed" });
      expect(dogApi.isBreed).toBeCalled();
      expect(dogApi.getDogByBreed).toBeCalled();
      expect(response.statusCode).toBe(200);
    });
    test("Bad Breed", async () => {
      myMock = jest
        .spyOn(dogApi, "isBreed")
        .mockImplementation(async (__: string, ___?: any) => {
          return false;
        });

      const response = await supertest(app)
        .get("/dogs/breed")
        .send({ breed: "breed", subBreed: "subBreed" });

      expect(dogApi.isBreed).toBeCalled();
      expect(dogApi.getDogByBreed).not.toBeCalled();
      expect(response.statusCode).toBe(404);
    });
  });
  describe("/DBDogs", () => {
    test("Get Breed", async () => {
      const response = await supertest(app).get("/dogs/dbdogs");

      expect(dogQueries.getAllDogsDB).toBeCalled();
      expect(response.statusCode).toBe(200);
      const expectedOutput = _.map(mockDogs, function (obj) {
        return _.omit(obj, "numberOfRates");
      });
      expect(response.body).toEqual(expectedOutput);
    });
  });
  describe("/", () => {
    test("Save dog", async () => {
      const response = await supertest(app)
        .post("/dogs")
        .send({ dog: { breed: "breed", url: "url " }, rating: 5 });
      expect(response.statusCode).toBe(200);
      expect(response.text).toBe("Dog added to DB!");
      expect(dogQueries.getDogByUrlDB).toBeCalled();
      expect(dogQueries.rateDogDB).toBeCalled();
      expect(dogQueries.saveDogToDB).not.toBeCalled();
    });
    test("Dog already exists", async () => {
      myMock = jest
        .spyOn(dogQueries, "getDogByUrlDB")
        .mockImplementation(async (url: string): Promise<any> => {
          return false;
        });
      const response = await supertest(app)
        .post("/dogs")
        .send({ dog: { breed: "breed", url: "url " }, rating: 5 });
      expect(response.statusCode).toBe(200);
      expect(response.text).toBe("Dog added to DB!");
      expect(dogQueries.getDogByUrlDB).toBeCalled();
      expect(dogQueries.rateDogDB).toBeCalled();
      expect(dogQueries.saveDogToDB).toBeCalled();
    });
  });
});
