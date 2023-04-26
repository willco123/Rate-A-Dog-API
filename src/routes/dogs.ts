import express from "express";
const router = express.Router();

import {
  saveDogToDB,
  getDogByField,
  saveUrlWithUser,
  updateUrlRating,
  saveSubBreedToDB,
  saveUrlIdToDog,
  aggregateUserSorted,
  aggregateRandomDocs,
  aggregateRandomWithExclusions,
  countUserAggregate,
  aggregateAllSorted,
  aggreagateSingleUrl,
  filteredCount,
  filteredCountUser,
} from "../models/dog";
import { saveUrlIdToUser, getUserUrls } from "../models/user";
import { isBreed, getDogByBreed } from "../services/dog-api";

import { Dog } from "./types";
import type { UrlRatingData } from "../models/types";
import { checkAccessToken, decodeToken } from "../middleware/auth";

router.post(
  "/url",
  [checkAccessToken],
  async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    try {
      const { url, userId } = req.body;
      const updatedUrl = await aggreagateSingleUrl(url, userId);
      return res.status(200).send(updatedUrl);
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
      const { sampleSize, authHeader } = req.body;

      let userId = undefined;
      if (authHeader) userId = decodeToken(authHeader);
      const randomDocs: UrlRatingData[] = await aggregateRandomDocs(
        sampleSize,
        userId,
      ); //order doesn't matter for random

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
      const { sampleSize, authHeader, currentlyLoadedDocuments } = req.body;

      let userId = undefined;
      if (authHeader) userId = decodeToken(authHeader);
      const moreDocs = await aggregateRandomWithExclusions(
        currentlyLoadedDocuments,
        sampleSize,
        userId,
      );

      return res.status(200).send(moreDocs);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/all/sorted",
  async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    try {
      let sortOrder: 1 | -1 = -1;
      if (req.body.sortOrder === "asc") sortOrder = 1;
      if (req.body.sortOrder === "desc") sortOrder = -1;
      const {
        sortMode,
        sampleSize,
        filteredBreed,
        currentMaxIndex,
        authHeader,
      } = req.body;
      let userId = undefined;
      if (authHeader) userId = decodeToken(authHeader);

      const aggregateAll = await aggregateAllSorted(
        sortOrder,
        sortMode,
        currentMaxIndex,
        sampleSize,
        userId,
        filteredBreed,
      );
      return res.status(200).send(aggregateAll);
    } catch (error) {
      next();
    }
  },
);

router.post(
  "/user",
  [checkAccessToken],
  async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    try {
      let sortOrder: 1 | -1 = -1;
      if (req.body.sortOrder === "asc") sortOrder = 1;
      if (req.body.sortOrder === "desc") sortOrder = -1;
      const { sortMode, sampleSize, filteredBreed, userId, currentMaxIndex } =
        req.body;
      const userUrlArray: string[] = await getUserUrls(userId);
      const aggregateUser = await aggregateUserSorted(
        userUrlArray,
        userId,
        sortOrder,
        sortMode,
        currentMaxIndex,
        sampleSize,
        filteredBreed,
      );
      return res.status(200).send(aggregateUser);
    } catch (error) {
      next();
    }
  },
);

router.get(
  "/user/maxcount",
  [checkAccessToken],
  async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    try {
      const userId = req.body.userId;
      const userUrlArray: string[] = await getUserUrls(userId);
      const count = await countUserAggregate(userUrlArray);
      return res.status(200).send(count);
    } catch (error) {
      next();
    }
  },
);

router.post(
  "/filtered/maxcount",
  async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    try {
      const { filteredBreed } = req.body;
      const count = await filteredCount(filteredBreed);
      return res.status(200).send(count);
    } catch (error) {
      next();
    }
  },
);

router.post(
  "/user/filtered/maxcount",
  [checkAccessToken],
  async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    try {
      const { filteredBreed, userId } = req.body;
      const userUrlArray = await getUserUrls(userId);
      const count = await filteredCountUser(filteredBreed, userUrlArray);
      return res.status(200).send(count);
    } catch (error) {
      next();
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
      if (!req.body.userId) throw new Error();
      const userId: string = req.body.userId;
      const { breed, subBreed, url, rating } = dog;

      const urlFromDB = await saveUrlWithUser(url, userId);

      let urlRating;
      if (rating) urlRating = await updateUrlRating(url, userId, rating);

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

      return res.status(200).send(urlRating);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
