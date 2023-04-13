import axios from "axios";
import {
  saveUrl,
  saveManyUrls,
  getDogByField,
  saveDogToDB,
  saveDogToDB2,
  saveSubBreedToDB,
  saveManyUrlIdsToDog,
  aggregateAll,
  aggregateThirtyRandomDocs,
} from "../models/dog";
import mongoose from "mongoose";
import { findIndex } from "lodash";
import type { UrlRatingData } from "../models/types";

interface dogData extends JSON {
  [key: string]: object;
}

type DogApiData = { [key: string]: string[] };
type DogApiFlat = { breed: string; subBreed: string | null }[];

export async function isBreed(
  breed: string,
  subBreed?: string,
): Promise<boolean> {
  //hit the endpoint, check if breed exists in db, useful as a search function
  try {
    const response = await axios.get("https://dog.ceo/api/breeds/list/all");
    const allBreeds: dogData = response.data.message;
    const isBreed = subBreed
      ? Object.values(allBreeds[breed]).includes(subBreed)
      : Object.keys(allBreeds).includes(breed);
    return isBreed;
  } catch (err) {
    throw err;
  }
}

export async function getRandomDog() {
  try {
    const response = await axios.get("https://dog.ceo/api/breeds/image/random");
    return response.data;
  } catch (err) {
    throw err;
  }
}

export async function getDogByBreed(breed: string, subBreed?: string | null) {
  try {
    const searchQuery = subBreed
      ? "https://dog.ceo/api/breed/" + breed + "/" + subBreed + "/images/random"
      : "https://dog.ceo/api/breed/" + breed + "/images/random";

    const response = await axios.get(searchQuery);
    return response.data.message;
  } catch (err) {
    throw err;
  }
}

/*
Hit dog-ceo, get all breeds, store them in the database
Run once on server start-up
Maybe make it so it runs when user logs in?
*/
export async function storeAllBreeds() {
  try {
    const response = await axios.get("https://dog.ceo/api/breeds/list/all");
    const allBreeds: DogApiData = response.data.message;

    const breedsArray = Object.entries(allBreeds);

    const breedsFlat: DogApiFlat = breedsArray.flatMap((element: any) => {
      //weirdness with flatMap typing
      const breed = element[0];
      const subBreed = element[1];
      if (subBreed.length === 0) {
        const output = { breed: breed, subBreed: null };
        return output;
      }
      const output = subBreed.map((element: any) => {
        return { breed: breed, subBreed: element };
      });

      return output;
    });

    breedsFlat.forEach(async ({ breed, subBreed }) => {
      const searchQuery = subBreed
        ? "https://dog.ceo/api/breed/" + breed + "/" + subBreed + "/images"
        : "https://dog.ceo/api/breed/" + breed + "/images";
      const response = await axios.get(searchQuery);
      const urlArayobj: { url: string }[] = response.data.message.map(
        (element: string) => {
          return { url: element };
        },
      );
      const urlIds = await saveManyUrls(urlArayobj);

      let dogFromDB = await saveDogToDB2(breed);

      let { _id: dbId, subBreed: dbSubBreed } = dogFromDB;

      if (subBreed && !dbSubBreed.includes(subBreed)) {
        dogFromDB = await saveSubBreedToDB(dbId, subBreed);
        dbSubBreed = dogFromDB.subBreed;
      }

      let subBreedIndex = dbSubBreed.findIndex((element) => {
        return element === subBreed;
      });
      if (subBreedIndex === -1) subBreedIndex = 0;
      await saveManyUrlIdsToDog(urlIds, dbId, subBreedIndex);
    });
  } catch (error: any) {
    throw new Error(error);
  }
}
