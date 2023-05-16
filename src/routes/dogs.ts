import express from "express";
const router = express.Router();

import {
  saveUrlWithUser,
  updateUrlRating,
  aggregateUserSorted,
  aggregateRandomDocs,
  aggregateRandomWithExclusions,
  countUserAggregate,
  countAggregate,
  aggregateAllSorted,
  aggreagateSingleUrl,
  aggregateDataForTable,
  aggregateUserDataForTable,
  filteredCount,
  filteredCountUser,
} from "../models/dog";
import { saveUrlIdToUser, getUserUrls } from "../models/user";
import { storeAllBreeds } from "../services/dog-api";
import { checkAccessToken, decodeToken, isAdmin } from "../middleware/auth";

router.post(
  "/",
  [checkAccessToken],
  async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    try {
      const { url, rating, userId } = req.body;
      const urlFromDB = await saveUrlWithUser(url, userId);
      if (rating) await updateUrlRating(url, userId, rating);
      const urlId = urlFromDB._id;
      await saveUrlIdToUser(urlId, userId);
      return res.status(200).send({ message: "success" });
    } catch (err) {
      next(err);
    }
  },
);

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
      const randomDocs = await aggregateRandomDocs(sampleSize, userId); //order doesn't matter for random

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
      const { sortMode, sampleSize, filteredBreed, skipCount, authHeader } =
        req.body;
      let userId = undefined;
      if (authHeader) userId = decodeToken(authHeader);

      const aggregateAll = await aggregateAllSorted(
        sortOrder,
        sortMode,
        skipCount,
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
      const { sortMode, sampleSize, filteredBreed, userId, skipCount } =
        req.body;
      const userUrlArray = await getUserUrls(userId);

      const aggregateUser = await aggregateUserSorted(
        userUrlArray,
        userId,
        sortOrder,
        sortMode,
        skipCount,
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
      const userUrlArray = await getUserUrls(userId);
      const count = await countUserAggregate(userUrlArray);
      return res.status(200).send({ count: count });
    } catch (error) {
      next();
    }
  },
);

router.get(
  "/maxcount",
  async (
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    try {
      const count = await countAggregate();
      return res.status(200).send({ count: count });
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
      return res.status(200).send({ count: count });
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
      return res.status(200).send({ count: count });
    } catch (error) {
      next();
    }
  },
);

router.get(
  "/table",
  async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    try {
      const tableData = await aggregateDataForTable();
      return res.status(200).send(tableData);
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  "/user/table",
  [checkAccessToken],
  async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    try {
      const { userId } = req.body;
      const userUrlArray = await getUserUrls(userId);
      const userTableData = await aggregateUserDataForTable(userUrlArray);
      return res.status(200).send(userTableData);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/admin/storeallbreeds",
  [checkAccessToken, isAdmin],
  async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    try {
      await storeAllBreeds();

      return res.status(200).send({ message: "success" });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
