import { UserSearchQuery } from "../models/types";
import db from "../config/db";

export async function insertTestData(collection: string, testData: object[]) {
  await db.collection(collection).insertMany(testData);
}

export async function deleteAllFromCollection(collection: string) {
  await db.collection(collection).deleteMany({});
}

export async function getItemFromCollection<Type>(
  collection: string,
  item: UserSearchQuery,
) {
  const itemFromCollection = <Type>(
    await db.collection(collection).findOne(item)
  );
  return itemFromCollection;
}
