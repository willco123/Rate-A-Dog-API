import supertest from "supertest";
import { setUpMockApp, createMockDogs } from "../../tests/test-helpers";
import router from "../favourites";
import { NextFunction, Request, Response } from "express";
import cookieParser from "cookie-parser";
import _ from "lodash";
import * as favouriteQueries from "../../models/favourite";
import * as dogQueries from "../../models/dog";

const mockDogs = createMockDogs();
let myMock: jest.SpyInstance;

jest.mock("../../models/dog", () => ({
  getDogByUrlDB: jest.fn().mockImplementation(() => {
    let mockDogFromDB = _.assign(mockDogs[0], { _id: "id" });
    return mockDogFromDB;
  }),
  saveDogToDB: jest.fn().mockImplementation(() => {
    let mockDogFromDB = _.assign(mockDogs[0], { _id: "id" });
    return mockDogFromDB;
  }),
}));

jest.mock("../../models/favourite", () => ({
  saveFavouriteToDB: jest.fn(),
  getFavourites: jest.fn().mockImplementation(async () => {
    let mockDogFromDB = _.assign(mockDogs[0], { _id: "id" });
    return [mockDogFromDB];
  }),
  deleteFavouriteDog: jest.fn(),
}));

jest.mock("passport", () => ({
  authenticate: jest.fn((_, __) => {
    return (___: Request, ____: Response, next: NextFunction) => {
      next();
    };
  }),
}));

jest.mock("jsonwebtoken", () => ({
  verify: jest.fn().mockImplementation(() => {
    let jwt = {
      userPayload: "payload",
    };
    return jwt;
  }),
}));

jest.mock("../../middleware/auth", () => ({
  login: jest
    .fn()
    .mockImplementation((_req: Request, res: Response, next: NextFunction) => {
      next();
    }),
}));

const app = setUpMockApp();
app.use(cookieParser());
app.use("/dogs/favourites", router);

afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

describe("ROUTES FAVOURITES", () => {
  describe("GET /", () => {
    test("successful case", async () => {
      const response = await supertest(app).get("/dogs/favourites");
      expect(response.statusCode).toBe(200);
    });
    test("Should return 404", async () => {
      myMock = jest
        .spyOn(favouriteQueries, "getFavourites")
        .mockImplementation(async () => {
          return null;
        });
      const response = await supertest(app).get("/dogs/favourites");
      expect(response.statusCode).toBe(404);
    });
  });
  describe("POST /", () => {
    test("successful case", async () => {
      const response = await supertest(app)
        .post("/dogs/favourites")
        .send({ dog: { breed: "breed", url: "url " } });
      expect(response.statusCode).toBe(200);
      expect(favouriteQueries.saveFavouriteToDB).toBeCalled();
    });
    test("No dog in DB", async () => {
      myMock = jest
        .spyOn(dogQueries, "getDogByUrlDB")
        .mockImplementation(async (url: string): Promise<any> => {
          return false;
        });
      const response = await supertest(app)
        .post("/dogs/favourites")
        .send({ dog: { breed: "breed", url: "url " } });
      expect(response.statusCode).toBe(200);
      expect(favouriteQueries.saveFavouriteToDB).toBeCalled();
      expect(dogQueries.saveDogToDB).toBeCalled();
    });
  });
  describe("DELETE /", () => {
    test("successful case", async () => {
      const response = await supertest(app).delete("/dogs/favourites");
      expect(response.statusCode).toBe(200);
      expect(favouriteQueries.deleteFavouriteDog).toBeCalled();
    });
    test("No dog in DB", async () => {
      myMock = jest
        .spyOn(dogQueries, "getDogByUrlDB")
        .mockImplementation(async (url: string): Promise<any> => {
          return false;
        });
      const response = await supertest(app).delete("/dogs/favourites");

      expect(response.statusCode).toBe(200);
      expect(favouriteQueries.deleteFavouriteDog).toBeCalled();
      expect(dogQueries.saveDogToDB).toBeCalled();
    });
  });
});
