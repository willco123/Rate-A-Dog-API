import { UserSearchQuery } from "../types";
import { saveUrlIdToUser } from "../models/user";
import { saveUrlWithUser, updateUrlRating } from "../models/dog";
import mongoose from "mongoose";

export async function insertTestData(
  db: mongoose.Connection | undefined,
  collection: string,
  testData: object[],
) {
  try {
    if (!db) throw new Error("db is undefined");
    const inserted = await db.collection(collection).insertMany(testData);
    return inserted;
  } catch (error) {
    console.log(error);
  }
}

export async function deleteAllFromCollection(
  db: mongoose.Connection | undefined,
  collection: string,
) {
  try {
    if (!db) throw new Error("db is undefined");
    await db.collection(collection).deleteMany({});
  } catch (error) {
    console.log(error);
  }
}

export async function getItemFromCollection<Type>(
  db: mongoose.Connection | undefined,
  collection: string,
  item: UserSearchQuery,
) {
  try {
    if (!db) throw new Error("db is undefined");
    const itemFromCollection = <Type>(
      await db.collection(collection).findOne(item)
    );
    return itemFromCollection;
  } catch (error) {
    console.log(error);
  }
}

export async function getAllItemsFromCollection(
  db: mongoose.Connection | undefined,
  collection: string,
) {
  try {
    if (!db) throw new Error("db is undefined");
    const itemsFromCollection = await db
      .collection(collection)
      .find()
      .toArray();
    return itemsFromCollection;
  } catch (error) {
    console.log(error);
    return [];
  }
}

export async function addUserRating(
  userId: string,
  rating: number,
  url: string,
) {
  try {
    await saveUrlWithUser(url, userId);
    const urlRating = await updateUrlRating(url, userId, rating);
    await saveUrlIdToUser(urlRating!._id, userId);
  } catch (error: any) {
    throw new Error(error);
  }
}
