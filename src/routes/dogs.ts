import express from "express";
const router = express.Router();

import {
  saveDogToDB,
  getDogByField,
  saveUrlWithUser,
  updateUrlRating,
  saveSubBreedToDB,
  saveUrlIdToDog,
  aggregateUserRatingsRandom,
  aggregateRandomDocs,
  aggregateRandomWithExclusions,
} from "../models/dog";
import { saveUrlIdToUser, getUserUrls } from "../models/user";
import { isBreed, getDogByBreed } from "../services/dog-api";

import { Dog } from "./types";
import type { UrlRatingData } from "../models/types";
import { checkAccessToken } from "../middleware/auth";

router.post(
  "/breed",
  [checkAccessToken],
  async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    try {
      const breed = req.body.breed;
      const subBreed = req.body.subBreed;
      if (!(await isBreed(breed, subBreed)))
        return res.status(404).send("Bad Breed");

      const dog = await getDogByBreed(breed, subBreed);
      return res.status(200).send(dog);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/all",
  async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    try {
      const sampleSize: number = req.body.sampleSize;
      const randomDocs: UrlRatingData[] = await aggregateRandomDocs(sampleSize); //order doesn't matter for random
      return res.status(200).send(randomDocs);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/all/more",
  async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    try {
      const currentlyLoadedDocuments: UrlRatingData[] =
        req.body.currentlyLoadedDocuments;
      const sampleSize: number = req.body.sampleSize;
      const moreDocs = await aggregateRandomWithExclusions(
        currentlyLoadedDocuments,
        sampleSize,
      );

      return res.status(200).send(moreDocs);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/all/sort",
  async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    try {
      const sampleSize: number = req.body.sampleSize;
      //Allow filtering by breed, subBreed, sort by average rating
      const randomDocs: UrlRatingData[] = await aggregateRandomDocs(sampleSize); //order doesn't matter for random
      return res.status(200).send(randomDocs);
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  "/user",
  [checkAccessToken],
  async (
    req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    try {
      //allow filtering by breed, subBreed, sort by average rating and my rating
      const userId = req.body.user;
      const userUrls = await getUserUrls(userId);
      const aggregateUser = await aggregateUserRatingsRandom(userUrls, userId);
      //need function, if arraysize < 100 do n
      return res.status(200).send(aggregateUser);
    } catch (error) {
      throw new Error();
    }
  },
);

router.get(
  "/user/more",
  [checkAccessToken],
  async (
    req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    try {
      const userId = req.body.user;
      const userUrls = await getUserUrls(userId);
      const aggregateUser = await aggregateUserRatingsRandom(userUrls, userId);

      return res.status(200).send(aggregateUser);
    } catch (error) {
      throw new Error();
    }
  },
);

router.post(
  "/",
  [checkAccessToken],
  async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    try {
      const dog: Dog = req.body.dog;
      if (!req.body.user) throw new Error();
      const userId: string = req.body.user;
      const { breed, subBreed, url, rating } = dog;

      const urlFromDB = await saveUrlWithUser(url, userId);

      if (rating) await updateUrlRating(url, userId, rating);

      const urlId = urlFromDB._id;
      await saveUrlIdToUser(urlId, userId);

      let dogFromDB = await getDogByField({ breed: breed });
      if (!dogFromDB) dogFromDB = await saveDogToDB(breed);

      let { _id: dbId, subBreed: dbSubBreed } = dogFromDB;

      if (subBreed && !dbSubBreed.includes(subBreed)) {
        dogFromDB = await saveSubBreedToDB(dbId, subBreed);
        dbSubBreed = dogFromDB.subBreed;
      }

      let subBreedIndex = dbSubBreed.findIndex((element) => {
        return element === subBreed;
      });

      if (subBreedIndex === -1) subBreedIndex = 0;

      await saveUrlIdToDog(urlId, dbId, subBreedIndex);

      return res.status(200);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
