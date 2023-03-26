import mongoose, { Types } from "mongoose";
import { Dog, DBDog, SearchFields, IdObj } from "./types";
import { isNotNull } from "../utils/type-guards";
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
    required: true,
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

export async function saveDogToDB(breed: string) {
  try {
    const aDog = new Dog({ breed: breed });
    await aDog.save();

    return aDog;
  } catch (err: any) {
    throw err;
  }
}

export async function getDogByField(field: SearchFields) {
  try {
    const dog = await Dog.findOne(field);
    return dog;
  } catch (err) {
    throw err;
  }
}

export async function saveSubBreedToDB(id: Types.ObjectId, subBreed: string) {
  try {
    const savedDog = await Dog.findOneAndUpdate(
      { _id: id },
      { $addToSet: { subBreed: subBreed } },
      { returnDocument: "after" },
    );
    if (savedDog === null) throw new Error();
    return savedDog;
  } catch (err) {
    throw err;
  }
}

export async function saveUrlIdToDog(
  urlId: IdObj,
  dogId: IdObj,
  index: number,
) {
  try {
    const response = await Dog.findOneAndUpdate(
      { _id: dogId },
      { $addToSet: { [`urlData.${index}`]: urlId } },
      { returnDocument: "after" },
    );
    return response;
  } catch (err: any) {
    throw new Error(err);
  }
}

export async function getUrl(url: string) {
  try {
    const dog = await UrlRating.findOne({ url: url });
    return dog;
  } catch (err) {
    throw err;
  }
}

export async function getAllDogsDB() {
  try {
    const dogs = await Dog.find({});

    // console.log(dogs[0].rating_docs);
    const filteredArray = dogs.filter(isNotNull);
    return filteredArray;
  } catch (err) {
    throw err;
  }
}

export async function saveUrl(url: string, userId: string) {
  try {
    const savedDog = await UrlRating.findOneAndUpdate(
      { url: url, "userRatingData.userId": { $ne: userId } },
      { $addToSet: { userRatingData: { $each: [{ userId: userId }] } } },
      { returnDocument: "after", upsert: true },
    );

    return savedDog;
  } catch (err: any) {
    if (err.code === 11000) {
      // console.log(err.keyValue.url);
      const urlFromDb = await UrlRating.findOne({ url: url });
      if (!urlFromDb) throw new Error();
      return urlFromDb;
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
    let urlRatingObj = await UrlRating.findOne(
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
    urlRatingObj = await UrlRating.findOneAndUpdate(
      { url: url, "userRatingData.userId": userId },
      {
        $inc: {
          numberOfRates: Object.values({ $cond: [isRatingNull, 1, 0] })[0][0],
        },
        $set: {
          "userRatingData.$.rating": rating,
        },
      },
      { new: true },
    );

    return urlRatingObj;
  } catch (err: any) {
    if (err.code === 11000) return false;
    throw err;
  }
}

export async function aggregateBySubBreed(index: number, breed: string) {
  const urlAggregatesBySubBreed = await Dog.aggregate([
    //outputs all urls and their average ratings and votes, grouped by subBreed
    {
      $match: {
        breed: breed,
      },
    },
    {
      $project: {
        ratingArray: { $arrayElemAt: ["$urlData", index] }, // access the item at the specified index, which will be associated witha subBreed
      },
    },
    {
      $lookup: {
        //get refs in doc
        from: "urlratings",
        localField: "ratingArray",
        foreignField: "_id",
        as: "rating_docs",
      },
    },
    { $unwind: "$rating_docs" },
    { $unwind: "$rating_docs.userRatingData" }, //expand arrays
    {
      $group: {
        //group and average all ratings/numberOfRates
        _id: "$rating_docs._id",
        avgRating: { $avg: "$rating_docs.userRatingData.rating" },
        rates: { $sum: "$rating_docs.numberOfRates" },
        url: { $addToSet: "$rating_docs.url" },
      },
    },
    {
      $project: {
        avgRating: 1,
        rates: 1,
        url: 1,
        _id: 0,
      },
    },
  ]);

  const urlArray: Array<string[]> = [];
  const averageRatingsArray: number[] = [];
  const ratesArray: number[] = [];
  urlAggregatesBySubBreed.forEach((element) => {
    urlArray.push(element.url[0]);
    averageRatingsArray.push(element.avgRating);
    ratesArray.push(element.rates);
  });
  const output = {
    averageRatingsArray: averageRatingsArray,
    ratesArray: ratesArray,
    urlArray: urlArray,
  };
  return output;
}

export function reduceRatings(myArray: number[]) {
  const average =
    myArray.reduce(
      (accumulator, currentValue) => accumulator + currentValue,
      0,
    ) / myArray.length;

  return average;
}

export function sumVotes(myArray: number[]) {
  const sum = myArray.reduce(
    (accumulator, currentValue) => accumulator + currentValue,
    0,
  );

  return sum;
}
