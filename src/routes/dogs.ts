import express from "express";
const router = express.Router();

import {
  getAllDogsDB,
  saveDogToDB,
  getDogByField,
  saveUrl,
  updateUrlRating,
  saveSubBreedToDB,
  saveUrlIdToDog,
  averageRatings,
  sumVotes,
  aggregateBySubBreed,
  aggregateUserRatings,
  aggregateAllGroupBySubBreed,
} from "../models/dog";
import {
  saveUrlIdToUser,
  getUserUrlRatings,
  getUserUrls,
} from "../models/user";
import { getRandomDog, isBreed, getDogByBreed } from "../services/dog-api";

import { Dog } from "./types";
import { checkAccessToken } from "../middleware/auth";

router.get(
  "/random",
  [checkAccessToken],
  async (
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    try {
      const randomDog = await getRandomDog();
      return res.send(randomDog);
    } catch (err) {
      next(err);
    }
  },
);

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

router.get(
  "/",
  async (
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    try {
      const response = await aggregateAllGroupBySubBreed();

      return res.status(200).send(response);
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
      const userId = req.body.user;
      const userUrls = await getUserUrls(userId);
      const aggregateUser = await aggregateUserRatings(userUrls, userId);
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

      const urlFromDB = await saveUrl(url, userId);

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
