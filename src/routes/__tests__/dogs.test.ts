import supertest from "supertest";
import { setUpMockApp } from "../../tests/test-helpers";
import { NextFunction, Request, Response } from "express";
import router from "../dogs";
import _ from "lodash";
import * as dbDog from "../../models/dog";
import * as dbUser from "../../models/user";
import * as auth from "../../middleware/auth";
import * as dogApi from "../../services/dog-api";

jest.mock("../../services/dog-api", () => ({
  storeAllBreeds: jest.fn(),
}));

jest.mock("../../models/dog", () => ({
  saveUrlWithUser: jest.fn().mockResolvedValue({ _id: "urlId" }),
  updateUrlRating: jest.fn(),
  aggreagateSingleUrl: jest.fn().mockResolvedValue({ message: "updatedUrl" }),
  aggregateRandomDocs: jest.fn().mockResolvedValue({ message: "randomDocs" }),
  aggregateRandomWithExclusions: jest
    .fn()
    .mockResolvedValue({ message: "moreRandomDocs" }),
  aggregateAllSorted: jest.fn().mockResolvedValue({ message: "sortedDocs" }),
  aggregateUserSorted: jest
    .fn()
    .mockResolvedValue({ message: "userSortedDocs" }),
  countAggregate: jest.fn().mockResolvedValue(5),
  filteredCount: jest.fn().mockResolvedValue(5),
  filteredCountUser: jest.fn().mockResolvedValue(5),
  aggregateDataForTable: jest.fn(),
  aggregateUserDataForTable: jest.fn(),
}));

jest.mock("../../models/user", () => ({
  saveUrlIdToUser: jest.fn(),
  getUserUrls: jest.fn().mockResolvedValue(["url1", "url2"]),
}));

jest.mock("../../middleware/auth", () => ({
  checkAccessToken: jest
    .fn()
    .mockImplementation((_req: Request, res: Response, next: NextFunction) => {
      next();
    }),
  isAdmin: jest
    .fn()
    .mockImplementation((_req: Request, res: Response, next: NextFunction) => {
      next();
    }),
  decodeToken: jest.fn().mockReturnValue({ userId: "userId", isAdmin: false }),
}));

const requestBody = {
  url: "https://example.com",
  rating: 5,
  userId: "userId",
  sampleSize: 5,
  authHeader: "Bearer token",
  currentlyLoadedDocuments: "someDocuments",
  sortOrder: "asc",
  sortMode: "breed",
  filteredBreed: "filteredBreed",
  skipCount: 0,
};

const app = setUpMockApp();
app.use("/", router);

afterEach(() => {
  jest.clearAllMocks();
});

describe("ROUTES DOGS", () => {
  describe("POST /", () => {
    it("should call the relevant db functions and return success", async () => {
      const response = await supertest(app).post("/").send(requestBody);
      expect(dbDog.saveUrlWithUser).toBeCalled();
      expect(dbDog.updateUrlRating).toBeCalled();
      expect(dbUser.saveUrlIdToUser).toBeCalled();
      expect(auth.checkAccessToken).toBeCalled();
      expect(response.statusCode).toBe(200);
    });
  });
  describe("POST /url", () => {
    it("should call the relevant db functions and return success", async () => {
      const response = await supertest(app).post("/url").send(requestBody);
      expect(dbDog.aggreagateSingleUrl).toBeCalled();
      expect(auth.checkAccessToken).toBeCalled();
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({ message: "updatedUrl" });
    });
  });
  describe("POST /all", () => {
    it("should call the relevant db functions and return success", async () => {
      const response = await supertest(app).post("/all").send(requestBody);
      expect(auth.decodeToken).toBeCalledWith(requestBody.authHeader);
      expect(dbDog.aggregateRandomDocs).toBeCalled();
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({ message: "randomDocs" });
    });
  });
  describe("POST /all/more", () => {
    it("should call the relevant db functions and return success", async () => {
      const response = await supertest(app).post("/all/more").send(requestBody);
      expect(auth.decodeToken).toBeCalledWith(requestBody.authHeader);
      expect(dbDog.aggregateRandomWithExclusions).toBeCalled();
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({ message: "moreRandomDocs" });
    });
  });
  describe("POST /all/sorted", () => {
    it("should call the relevant db functions and return success", async () => {
      const response = await supertest(app)
        .post("/all/sorted")
        .send(requestBody);
      expect(auth.decodeToken).toBeCalledWith(requestBody.authHeader);
      expect(dbDog.aggregateAllSorted).toBeCalled();
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({ message: "sortedDocs" });
    });
  });
  describe("POST /user", () => {
    it("should call the relevant db functions and return success", async () => {
      const response = await supertest(app).post("/user").send(requestBody);
      expect(auth.checkAccessToken).toBeCalled();
      expect(dbUser.getUserUrls).toBeCalled();
      expect(dbDog.aggregateUserSorted).toBeCalled();
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({ message: "userSortedDocs" });
    });
  });
  describe("GET /user/maxcount", () => {
    it("should call the relevant db functions and return success", async () => {
      const response = await supertest(app).get("/user/maxcount");

      expect(auth.checkAccessToken).toBeCalled();
      expect(dbUser.getUserUrls).toBeCalled();
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({ count: 2 });
    });
  });
  describe("GET /maxcount", () => {
    it("should call the relevant db functions and return success", async () => {
      const response = await supertest(app).get("/maxcount");
      expect(dbDog.countAggregate).toBeCalled();
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({ count: 5 });
    });
  });
  describe("POST /filtered/maxcount", () => {
    it("should call the relevant db functions and return success", async () => {
      const response = await supertest(app)
        .post("/filtered/maxcount")
        .send(requestBody);
      expect(dbDog.filteredCount).toBeCalled();
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({ count: 5 });
    });
  });
  describe("POST /user/filtered/maxcount", () => {
    it("should call the relevant db functions and return success", async () => {
      const response = await supertest(app)
        .post("/user/filtered/maxcount")
        .send(requestBody);
      expect(auth.checkAccessToken).toBeCalled();
      expect(dbUser.getUserUrls).toBeCalled();
      expect(dbDog.filteredCountUser).toBeCalled();
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({ count: 5 });
    });
  });
  describe("GET /table", () => {
    it("should call the relevant db functions and return success", async () => {
      const response = await supertest(app).get("/table");
      expect(dbDog.aggregateDataForTable).toBeCalled();
      expect(response.statusCode).toBe(200);
    });
  });
  describe("GET /user/table", () => {
    it("should call the relevant db functions and return success", async () => {
      const response = await supertest(app).get("/user/table");
      expect(auth.checkAccessToken).toBeCalled();
      expect(dbUser.getUserUrls).toBeCalled();
      expect(dbDog.aggregateUserDataForTable).toBeCalled();
      expect(response.statusCode).toBe(200);
    });
  });
  describe("POST /admin/storeallbreeds", () => {
    it("should call the relevant db functions and return success", async () => {
      const response = await supertest(app).post("/admin/storeallbreeds");
      expect(auth.checkAccessToken).toBeCalled();
      expect(auth.isAdmin).toBeCalled();
      expect(dogApi.storeAllBreeds).toBeCalled();
      expect(response.statusCode).toBe(200);
    });
  });
});

// jest.mock("passport", () => ({
//   authenticate: jest.fn((_, __) => {
//     return (___: Request, ____: Response, next: NextFunction) => {
//       next();
//     };
//   }),
// }));

//     myMock = jest
//       .spyOn(dogApi, "isBreed")
//       .mockImplementation(async (__: string, ___?: any) => {
//         return false;
//       });
