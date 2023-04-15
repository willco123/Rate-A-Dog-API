import express from "express";
const router = express.Router();

import {
  saveDogToDB,
  getDogByField,
  saveUrlWithUser,
  updateUrlRating,
  saveSubBreedToDB,
  saveUrlIdToDog,
  aggregateUserRatings,
  aggregateAllGroupBySubBreed,
  aggregateAll,
  aggregateThirtyRandomDocs,
  aggregateTenRandomWithExclusions,
  aggregateRandomDocs,
  aggregateRandomWithExclusions,
} from "../models/dog";
import { saveUrlIdToUser, getUserUrls } from "../models/user";
import { getRandomDog, isBreed, getDogByBreed } from "../services/dog-api";

import { Dog } from "./types";
import type { UrlRatingData } from "../models/types";
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
  "/all",
  async (
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    try {
      const randomDocs: UrlRatingData[] = await aggregateRandomDocs(100); //assumes atleast 50 docs here, 100+ breeds so should be safe
      // const randomDocs = Array(100).fill(null);
      return res.status(200).send(randomDocs);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/ten/upper",
  async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    try {
      const currentlyLoadedDocuments: UrlRatingData[] = req.body.urlRatingData;
      const moreDocs = await aggregateRandomWithExclusions(
        currentlyLoadedDocuments,
        40,
      );
      const nullArray = Array(40).fill(null);
      let lastNonNullValue: number = 0; // Initialize to null

      for (let i = currentlyLoadedDocuments.length - 1; i >= 0; i--) {
        if (currentlyLoadedDocuments[i] !== null) {
          lastNonNullValue = i;
          break; // Exit the loop after finding the first non-null value
        }
      }
      console.log(lastNonNullValue);
      const output = [
        ...nullArray, //add 40 nulls to the beginning
        ...currentlyLoadedDocuments.slice(
          lastNonNullValue - 60,
          lastNonNullValue,
        ), //add 60 docs before the last non null
        ...moreDocs, //ad 40 random docs
        ...currentlyLoadedDocuments.slice(lastNonNullValue + 40, -1), //add the rest of the docs - 40 nulls
      ];
      // output.forEach((element) => {
      //   if (element == null) console.log(element);
      //   else console.log(element.breed);
      // });
      return res.status(200).send(output);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/ten/lower",
  async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    try {
      const currentlyLoadedDocuments: UrlRatingData[] = req.body.urlRatingData;
      const moreDocs = await aggregateRandomWithExclusions(
        currentlyLoadedDocuments,
        40,
      );
      const nullArray = Array(40).fill(null);

      const firstLowerDataIndex = currentlyLoadedDocuments.findIndex((el) => {
        return el != null;
      });

      const lowerNullArray = [
        ...currentlyLoadedDocuments.slice(0, firstLowerDataIndex),
      ];
      if (lowerNullArray.length > 0) lowerNullArray.splice(0, 40); //remove 40 nulls

      let lastNonNullValue: number = 0;

      for (let i = currentlyLoadedDocuments.length - 1; i >= 0; i--) {
        if (currentlyLoadedDocuments[i] !== null) {
          lastNonNullValue = i;
          break;
        }
      }

      const upperNullArray = [
        ...currentlyLoadedDocuments.slice(lastNonNullValue, -1),
        ...nullArray,
      ];

      const output = [
        ...lowerNullArray,
        ...moreDocs,
        ...currentlyLoadedDocuments.slice(
          firstLowerDataIndex,
          firstLowerDataIndex + 60,
        ),
        ...upperNullArray,
      ];
      // output.forEach((element) => {
      //   if (element == null) console.log(element);
      //   else console.log(element.breed);
      // });
      return res.status(200).send(output);
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  "/user2",
  async (
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    try {
      const thirtyRandomDocs: UrlRatingData[] =
        await aggregateThirtyRandomDocs();

      return res.status(200).send(thirtyRandomDocs);
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

// for (let i = 0; i < 10; i++) {
//   console.log("i is:", i);
//   const documents = currentlyLoadedDocuments[i];
//   console.log("documents: ", documents.breed);
//   const urlRatingLength = documents.urlRatings.length;
//   for (let j = 0; j < urlRatingLength; j++) {
//     console.log("j is:", j);
//     console.log("urlratings: ", documents.urlRatings[j]);
//     urlCounter++;
//     console.log("afterurlcounter++", urlCounter);
//     if (urlCounter === 10) {
//       documentIndex = i;
//       urlRatingIndex = j;
//       break;
//     }
//   }
//   if (urlCounter === 10) break;
// }
// console.log(documentIndex, urlRatingIndex);
// console.log("currentlyLoadedDocuments", currentlyLoadedDocuments);
// currentlyLoadedDocuments.splice(0, documentIndex);
// const firstDocument = currentlyLoadedDocuments[0].urlRatings;
// if (firstDocument.length === urlRatingIndex + 1)
//   currentlyLoadedDocuments.splice(0, 1);
// else firstDocument.splice(0, urlRatingIndex + 1);
// console.log(currentlyLoadedDocuments);
