import express from "express";
const router = express.Router();

import {
  getAllDogsDB,
  saveDogToDB,
  getDogByField,
  saveUrl,
  updateUrlRating,
  saveSubBreedToDB,
  getUrl,
  saveUrlIdToDog,
  reduceRatings,
  sumVotes,
  aggregateBySubBreed,
} from "../models/dog";
import { saveUrlIdToUser } from "../models/user";
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
  "/dbdogs",

  async (
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    try {
      const dogs = await getAllDogsDB();
      const outputArrayPromise = dogs.map(async ({ breed, subBreed }) => {
        const newRating: number[] = [];
        const numberOfRates: number[] = [];
        const urlArray: any = [];

        const iterRange = subBreed.length ? subBreed.length : 1;

        for (let i = 0; i < iterRange; i++) {
          const response = await aggregateBySubBreed(i, breed);

          newRating.push(reduceRatings(response.averageRatingsArray));
          numberOfRates.push(sumVotes(response.ratesArray));
          urlArray.push(response.urlArray);
        }

        return {
          url: urlArray,
          breed,
          subBreed,
          rating: newRating,
          numberOfRates: numberOfRates,
        };
      });

      const outputArray = await Promise.all(outputArrayPromise);
      console.log(outputArray);
      return res.status(200).send(outputArray);
    } catch (err) {
      next(err);
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

      const response = await aggregateBySubBreed(subBreedIndex, breed);

      return res.status(200).send("Dog Rated!");
    } catch (err) {
      next(err);
    }
  },
);

export default router;
