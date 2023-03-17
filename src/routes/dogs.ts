import express from "express";
const router = express.Router();
import {
  getAllDogsDB,
  getDogByUrlDB,
  saveDogToDB,
  rateDogDB,
} from "../models/dog";
import { getRandomDog, isBreed, getDogByBreed } from "../services/dog-api";
import passport from "passport";
const passportMiddleware = passport.authenticate(
  ["access-token", "refresh-token"],
  {
    session: false,
  },
);
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
  [checkAccessToken],
  async (
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    try {
      let dogs = await getAllDogsDB();

      const outputArray = dogs.map(({ url, breed, rating }) => ({
        url,
        breed,
        rating,
      }));
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
      const rating = req.body.rating;
      const url = dog.url;
      let dogFromDB = await getDogByUrlDB(url);
      if (!dogFromDB) dogFromDB = await saveDogToDB(dog);

      const dogId = dogFromDB._id;
      await rateDogDB(dogId, rating);
      return res.status(200).send("Dog added to DB!");
    } catch (err) {
      next(err);
    }
  },
);

export default router;
