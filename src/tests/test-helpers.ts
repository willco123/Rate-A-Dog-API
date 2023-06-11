import express from "express";
import { Types } from "mongoose";
import type { UrlRating, Dogs } from "../types";

export function setUpMockApp() {
  const app = express();
  app.use(express.json());
  return app;
}

export function createMockUsers() {
  let mockUsers = [
    {
      username: "mockUser1",
      password: "mockPass1",
      email: "mockEmail1@gmail.com",
      rank: "user",
      urls: [],
    },

    {
      username: "mockUser2",
      password: "mockPass2",
      email: "mockEmail2@gmail.com",
      rank: "user",
      urls: [],
    },

    {
      username: "mockUser3",
      password: "mockPass3",
      email: "mockEmail3@gmail.com",
      rank: "user",
      urls: [],
    },
  ];
  return mockUsers;
}

export function createMockUrlRatings() {
  const mockUrlRatings: Omit<UrlRating, "_id">[] = [];

  for (let i = 0; i < 200; i++) {
    mockUrlRatings.push({
      url: `url${i}.jpg`,
      numberOfRates: 0,
      userRatingData: [],
    });
  }
  return mockUrlRatings;
}

export function createMockDogs(urlIds: Types.ObjectId[]) {
  let mockDogs: Omit<Dogs, "_id">[] = [];
  const noSubBreedUrlsIds = urlIds.slice(0, 50);
  const singleSubBreedUrlsIds = urlIds.slice(50, 100);
  const twoSubBreedUrlsIds = urlIds.slice(100, 200);

  for (let i = 0; i < 10; i++) {
    mockDogs.push({
      breed: `breed${i}`,
      subBreed: [],
      urlData: [[...noSubBreedUrlsIds.slice(i * 5, (i + 1) * 5)]],
    });
  }
  for (let i = 0; i < 10; i++) {
    mockDogs.push({
      breed: `breed${i}WithOneSubBreed`,
      subBreed: ["subBreed2"],
      urlData: [[...singleSubBreedUrlsIds.slice(i * 5, (i + 1) * 5)]],
    });
  }
  for (let i = 0; i < 10; i++) {
    mockDogs.push({
      breed: `breed${i}WithTwoSubBreed`,
      subBreed: ["subBreed1", "subBreed2"],
      urlData: [
        [...twoSubBreedUrlsIds.slice(i * 5, (i + 1) * 5)],
        [...twoSubBreedUrlsIds.slice((i + 50) * 5, (i + 51) * 5)],
      ],
    });
  }
  return mockDogs;
}

export function mockGetRouteWithMiddleware(
  app: express.Express,
  middleware: any,
) {
  app.get("/", middleware, (req, res) => {
    res.send("Test");
  });
}
