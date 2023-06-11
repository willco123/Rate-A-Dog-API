import mongoose, { Types } from "mongoose";
import type {
  UrlRatingData,
  SingleUrlOnRate,
  UrlRating,
  TableData,
} from "../types";
import {
  matchUserUrls,
  matchBreedFilter,
  matchSubBreedFilter,
  matchUrl,
  excludeBreeds,
  excludeNonZero,
  projectMatchingUserUrls,
  projectAndZipSubBreedUrlArrays,
  projectStandardFormat,
  projectTidyUpMyRatings,
  projectStandardFormatNoUser,
  projectUrlsForCount,
  projectSingleUrlTidyUpMyRating,
  projectSingleUrlOnRate,
  projectSubBreedForGroup,
  projectTidyUpGroupedSubBreeds,
  groupBySubBreed,
  unwindUrlSubBreed,
  unwindUrlRatingData,
  lookupUrlRatingDataFromZip,
  sortAndBiasByUrl,
  skipByCount,
  limitBySampleSize,
  randomSample,
} from "../utils/aggregate-pipeline/dog-aggregates";
const Schema = mongoose.Schema;

const UserRatingSchema = new Schema({
  userId: { type: Types.ObjectId, required: true, ref: "Users" },
  rating: { type: Number, default: null, min: 0, max: 5 },
});

const UrlRatingSchema = new Schema({
  url: { type: String, maxLength: 254, required: true, unique: true },
  numberOfRates: { type: Number, default: 0 },
  userRatingData: {
    type: [UserRatingSchema],
    validate: [
      {
        validator: function (newDocs: any) {
          const urls = newDocs.map((doc: any) => doc.url.toLowerCase());
          return urls.length === new Set(urls).size; // check if all names are unique
        },
        message: "Duplicate child names are not allowed within the same parent",
      },
    ],
  },
});

const UrlRating = mongoose.model("UrlRating", UrlRatingSchema);

const DogSchema = new Schema({
  breed: { type: String, required: true, maxLength: 100, unique: true },
  subBreed: {
    type: Array,
    maxLength: 100,
    of: String,
  },
  urlData: [{ type: Array, ref: "UrlRating", of: Types.ObjectId }],
});

const Dog = mongoose.model("Dog", DogSchema);

export async function deleteUserRating(
  dogId: string | Types.ObjectId,
  userId: string | Types.ObjectId,
) {
  try {
    const aDog = await UrlRating.findOneAndUpdate(
      { _id: dogId },
      {
        $pull: { "urlData.userRatingData": { userId: userId } },
        $inc: { "urlData.numberOfRates": -1 },
      },
      { new: true },
    );

    if (!aDog) throw new Error("Dog not found");
    return aDog;
  } catch (error) {
    throw error;
  }
}

export async function saveDogToDB(breed: string) {
  try {
    const aDog = await Dog.findOneAndUpdate(
      { breed: breed },
      { breed: breed },
      { upsert: true, new: true },
    );

    return aDog;
  } catch (err: any) {
    throw err;
  }
}

export async function saveUrlWithUser(url: string, userId: string) {
  try {
    const newRating: UrlRating = await UrlRating.findOneAndUpdate(
      { url: url, "userRatingData.userId": { $ne: userId } },
      { $addToSet: { userRatingData: { $each: [{ userId: userId }] } } },
      { returnDocument: "after", upsert: true },
    );

    return newRating;
  } catch (err: any) {
    if (err.code === 11000) {
      // console.log(err.keyValue.url);
      //Runs if the url already exists in the db
      const existingRating: UrlRating | null = await UrlRating.findOne({
        url: url,
      });
      if (!existingRating) throw new Error();
      return existingRating;
    }
    throw err;
  }
}

export async function updateUrlRating(
  url: string,
  userId: string,
  rating: number,
) {
  try {
    const urlRatingObj: UrlRating | null = await UrlRating.findOne(
      {
        url: url,
        "userRatingData.userId": userId,
      },
      {
        "userRatingData.$": 1,
        numberOfRates: 1,
      },
    );
    if (urlRatingObj === null) throw new Error();

    const isRatingNull = urlRatingObj.userRatingData[0].rating ? false : true;
    //for some reason i had to use this roundabout method to get $cond to actually return a number
    //using $eq to match the user rating threw a cast error aswell
    const output = await UrlRating.findOneAndUpdate(
      { url: url, "userRatingData.userId": userId },
      {
        $inc: {
          numberOfRates: Object.values({ $cond: [isRatingNull, 1, 0] })[0][0],
        },
        $set: {
          "userRatingData.$.rating": rating,
        },
      },
      { new: true, runValidators: true },
    );

    return output;
  } catch (err: any) {
    // if (err.code === 11000) return false;
    throw new Error(err);
  }
}

export async function saveManyUrls(urls: { url: string }[]) {
  try {
    const savedUrls = await UrlRating.insertMany(urls, { ordered: false });

    const output = savedUrls.map((element: any) => {
      const { _id } = element;
      return _id;
    });
    return output;
  } catch (err: any) {
    if (err.code === 11000) {
      // const collisions = err.writeErrors.map((element: any) => {
      //   const { url, _id } = element.err.op;
      //   return { url: url, _id: _id };
      // });
      const insertedDocs = err.insertedDocs.map((element: any) => {
        const { _id } = element;
        return { _id: _id };
      });
      return insertedDocs;
    }

    throw new Error(err);
  }
}

export async function saveManyUrlIdsToDog(
  urlIds: Types.ObjectId[],
  dogId: Types.ObjectId,
  index: number,
) {
  try {
    const response = await Dog.updateOne(
      { _id: dogId },
      { $addToSet: { [`urlData.${index}`]: { $each: urlIds } } },
      { returnDocument: "after" },
    );
    return response;
  } catch (err: any) {
    throw new Error(err);
  }
}

export async function saveSubBreedToDB(id: Types.ObjectId, subBreed: string) {
  //could store null here if subBreed==null|undefined
  try {
    let savedDog = await Dog.findOneAndUpdate(
      { _id: id },
      { $addToSet: { subBreed: subBreed } },
      { returnDocument: "after" },
    );
    if (savedDog === null) throw new Error();
    const index = savedDog.subBreed.findIndex((item) => item === subBreed);
    savedDog = await Dog.findOneAndUpdate(
      { _id: id },
      { $set: { [`urlData.${index}`]: [] } },
      { returnDocument: "after" },
    );
    if (savedDog === null) throw new Error();
    return savedDog;
  } catch (err) {
    throw err;
  }
}

export async function aggregateRandomDocs(sampleSize: number, userId?: string) {
  let id: Types.ObjectId | undefined = undefined;
  if (userId) id = new Types.ObjectId(userId);

  try {
    const fiftyDocs: UrlRatingData[] = await Dog.aggregate([
      projectAndZipSubBreedUrlArrays,
      unwindUrlSubBreed,
      lookupUrlRatingDataFromZip,
      unwindUrlRatingData,
      randomSample(sampleSize),
      ...(id
        ? [projectStandardFormat(id), projectTidyUpMyRatings]
        : [projectStandardFormatNoUser]),
    ]);
    return fiftyDocs;
  } catch (error: any) {
    throw new Error(error);
  }
}

export async function aggregateRandomWithExclusions(
  currentlyLoadedDocuments: UrlRatingData[],
  sampleSize: number,
  userId?: string,
) {
  let id: Types.ObjectId | undefined = undefined;
  if (userId) id = new Types.ObjectId(userId);

  try {
    const moreDocs: UrlRatingData[] = await Dog.aggregate([
      excludeBreeds(currentlyLoadedDocuments),
      projectAndZipSubBreedUrlArrays,
      unwindUrlSubBreed,
      lookupUrlRatingDataFromZip,
      unwindUrlRatingData,
      randomSample(sampleSize),
      ...(id
        ? [projectStandardFormat(id), projectTidyUpMyRatings]
        : [projectStandardFormatNoUser]),
    ]);
    return moreDocs;
  } catch (error: any) {
    throw new Error(error);
  }
}

export async function aggregateAllSorted(
  sortOrder: 1 | -1 = -1,
  sortMode: "averageRating" | "numberOfRates" | "breed" = "breed",
  skipCount: number = 0,
  sampleSize: number = 50,
  userId?: string,
  filteredBreed?: { breed: string; subBreed: string | null },
) {
  try {
    let id: Types.ObjectId | undefined = undefined;
    if (userId) id = new Types.ObjectId(userId);
    const urlRatings: UrlRatingData[] = await Dog.aggregate([
      matchBreedFilter(filteredBreed),
      projectAndZipSubBreedUrlArrays,
      unwindUrlSubBreed,
      matchSubBreedFilter(filteredBreed),
      lookupUrlRatingDataFromZip,
      unwindUrlRatingData,
      ...(id
        ? [projectStandardFormat(id), projectTidyUpMyRatings]
        : [projectStandardFormatNoUser]),
      sortAndBiasByUrl(sortOrder, sortMode),
      excludeNonZero(sortMode),
      skipByCount(skipCount),
      limitBySampleSize(sampleSize),
    ]);
    return urlRatings;
  } catch (error: any) {
    throw new Error(error);
  }
}

export async function aggregateUserSorted(
  urlIdArray: string[],
  userId: string,
  sortOrder: 1 | -1 = -1,
  sortMode:
    | "averageRating"
    | "numberOfRates"
    | "myRating"
    | "breed" = "averageRating",
  skipCount: number = 0,
  sampleSize = 50,
  filteredBreed?: { breed: string; subBreed: string | null },
) {
  try {
    const id = new Types.ObjectId(userId);
    const userRatings: UrlRatingData[] = await Dog.aggregate([
      matchUserUrls(urlIdArray),
      matchBreedFilter(filteredBreed),
      projectMatchingUserUrls(urlIdArray),
      projectAndZipSubBreedUrlArrays,
      unwindUrlSubBreed,
      matchSubBreedFilter(filteredBreed),
      lookupUrlRatingDataFromZip,
      unwindUrlRatingData,
      projectStandardFormat(id),
      projectTidyUpMyRatings,
      sortAndBiasByUrl(sortOrder, sortMode),
      skipByCount(skipCount),
      limitBySampleSize(sampleSize),
    ]);

    return userRatings;
  } catch (error: any) {
    throw new Error(error);
  }
}

export async function aggregateDataForTable() {
  const tableData: TableData[] = await Dog.aggregate([
    projectAndZipSubBreedUrlArrays,
    unwindUrlSubBreed,
    lookupUrlRatingDataFromZip,
    unwindUrlRatingData,
    projectSubBreedForGroup,
    groupBySubBreed,
    projectTidyUpGroupedSubBreeds,
  ]);
  return tableData;
}

export async function aggregateUserDataForTable(urlIdArray: string[]) {
  const userTableData: TableData[] = await Dog.aggregate([
    matchUserUrls(urlIdArray),
    projectAndZipSubBreedUrlArrays,
    unwindUrlSubBreed,
    lookupUrlRatingDataFromZip,
    unwindUrlRatingData,
    projectSubBreedForGroup,
    groupBySubBreed,
    projectTidyUpGroupedSubBreeds,
  ]);

  return userTableData;
}

export async function aggreagateSingleUrl(url: string, userId: string) {
  try {
    const id = new Types.ObjectId(userId);
    const urlData: SingleUrlOnRate[] = await UrlRating.aggregate([
      matchUrl(url),
      projectSingleUrlOnRate(id),
      projectSingleUrlTidyUpMyRating,
    ]);

    return urlData[0];
  } catch (error: any) {
    throw new Error(error);
  }
}

export async function countAggregate() {
  try {
    const totalCount = await UrlRating.countDocuments([{}]);

    return totalCount;
  } catch (error: any) {
    throw new Error(error);
  }
}

export async function filteredCount(filteredBreed: {
  breed: string;
  subBreed: string | null;
}) {
  try {
    const matchingDocs: { url: string }[] = await Dog.aggregate([
      matchBreedFilter(filteredBreed),
      projectAndZipSubBreedUrlArrays,
      unwindUrlSubBreed,
      matchSubBreedFilter(filteredBreed),
      lookupUrlRatingDataFromZip,
      unwindUrlRatingData,
      projectUrlsForCount,
    ]);
    return matchingDocs.length;
  } catch (error: any) {
    throw new Error(error);
  }
}

export async function filteredCountUser(
  filteredBreed: { breed: string; subBreed: string | null },
  urlIdArray: string[],
) {
  try {
    const matchingDocs: { url: string }[] = await Dog.aggregate([
      matchBreedFilter(filteredBreed),
      projectMatchingUserUrls(urlIdArray),
      projectAndZipSubBreedUrlArrays,
      unwindUrlSubBreed,
      matchSubBreedFilter(filteredBreed),
      lookupUrlRatingDataFromZip,
      unwindUrlRatingData,
      projectUrlsForCount,
    ]);
    return matchingDocs.length;
  } catch (error: any) {
    throw new Error(error);
  }
}
