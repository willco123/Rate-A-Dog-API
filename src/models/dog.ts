import mongoose, { Types } from "mongoose";
import { Dog, SearchFields, IdObj } from "./types";
import { isNotNull } from "../utils/type-guards";
import type { UrlRatingData, FilteredDataNoNulls } from "./types";
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
    // required: true,
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

export async function saveDogToDB2(breed: string) {
  try {
    const aDog = Dog.findOneAndUpdate(
      { breed: breed },
      { breed: breed },
      { upsert: true, new: true },
    );

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

export async function saveManyUrlIdsToDog(
  urlIds: IdObj[],
  dogId: IdObj,
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
    const filteredArray = dogs.filter(isNotNull);
    return filteredArray;
  } catch (err) {
    throw err;
  }
}

export async function saveUrl(url: string) {
  try {
    const newUrl = new UrlRating({ url: url });
    const savedUrl = await newUrl.save();

    return savedUrl;
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

export async function saveUrlWithUser(url: string, userId: string) {
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
    const match: any = {
      urlData: {
        $elemMatch: {
          $elemMatch: { $in: urlIdArray },
        },
      },
    };
    let breed: any = {};
    let subBreed: any = {};
    if (filteredBreed) {
      breed.breed = filteredBreed.breed;
      subBreed["urlSubBreed.0"] = filteredBreed.subBreed;
    }
    const userRatings = await Dog.aggregate([
      { $match: match },
      { $match: breed },
      {
        $project: {
          breed: 1,
          subBreed: 1,
          urlData: {
            $map: {
              input: "$urlData",
              as: "innerArray",
              in: {
                $filter: {
                  input: "$$innerArray",
                  as: "url",
                  cond: { $in: ["$$url", urlIdArray] },
                },
              },
            },
          },
        },
      },
      {
        $project: {
          breed: 1,
          urlSubBreed: {
            $zip: { inputs: ["$subBreed", "$urlData"], useLongestLength: true }, //plugs null into the shorter array
          },
        },
      },

      { $unwind: "$urlSubBreed" },
      { $match: subBreed },
      {
        $lookup: {
          from: "urlratings",
          localField: "urlSubBreed.1",
          foreignField: "_id",
          as: "urlRatingData",
        },
      },
      {
        $unwind: "$urlRatingData",
      },
      {
        $project: {
          _id: 0,
          breed: 1,
          subBreed: { $arrayElemAt: ["$urlSubBreed", 0] },
          url: "$urlRatingData.url",
          numberOfRates: "$urlRatingData.numberOfRates",

          myRating: {
            $filter: {
              input: "$urlRatingData.userRatingData",
              as: "rating",
              cond: { $eq: ["$$rating.userId", id] },
            },
          },
          averageRating: {
            $avg: { $avg: "$urlRatingData.userRatingData.rating" },
          },
        },
      },
      {
        $project: {
          _id: 0,
          breed: 1,
          subBreed: 1,
          url: 1,
          numberOfRates: 1,

          myRating: {
            $arrayElemAt: [
              {
                $map: {
                  input: "$myRating",
                  as: "rating",
                  in: "$$rating.rating",
                },
              },
              0,
            ],
          },
          averageRating: 1,
        },
      },
      {
        $sort: { [sortMode]: sortOrder, url: 1 },
      },
      {
        $skip: skipCount,
      },
      {
        $limit: sampleSize,
      },
    ]);

    return userRatings;
  } catch (error: any) {
    throw new Error(error);
  }
}

export async function aggregateRandomDocs(sampleSize: number, userId?: string) {
  let id: Types.ObjectId | undefined = undefined;
  if (userId) id = new Types.ObjectId(userId);

  try {
    const fiftyDocs: UrlRatingData[] = await Dog.aggregate([
      {
        $project: {
          breed: 1,
          urlSubBreed: {
            $zip: { inputs: ["$subBreed", "$urlData"], useLongestLength: true }, //plugs null into the shorter array
          },
        },
      },

      { $unwind: "$urlSubBreed" },
      {
        $lookup: {
          from: "urlratings",
          localField: "urlSubBreed.1",
          foreignField: "_id",
          as: "urlRatingData",
        },
      },
      {
        $unwind: "$urlRatingData",
      },

      { $sample: { size: sampleSize } },

      {
        $project: {
          _id: 0,
          breed: 1,
          subBreed: { $arrayElemAt: ["$urlSubBreed", 0] },
          url: "$urlRatingData.url",
          numberOfRates: "$urlRatingData.numberOfRates",
          userRatingData: "$urlRatingData.userRatingData",
          myRating: {
            $filter: {
              input: "$urlRatingData.userRatingData",
              as: "rating",
              cond: { $eq: ["$$rating.userId", id] },
            },
          },
          averageRating: {
            $avg: { $avg: "$urlRatingData.userRatingData.rating" },
          },
        },
      },
      {
        $project: {
          _id: 0,
          breed: 1,
          subBreed: 1,
          url: 1,
          numberOfRates: 1,

          myRating: {
            $arrayElemAt: [
              {
                $map: {
                  input: "$myRating",
                  as: "rating",
                  in: "$$rating.rating",
                },
              },
              0,
            ],
          },
          averageRating: 1,
        },
      },
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

  const excludedBreedsAndSubBreeds = currentlyLoadedDocuments.map((doc) => {
    if (!doc) return doc;
    return {
      breed: doc.breed,
      subBreed: doc.subBreed,
    };
  });

  const filteredExcludedBreedsAndSubBreeds: FilteredDataNoNulls[] = [];
  excludedBreedsAndSubBreeds.forEach((doc) => {
    if (doc) filteredExcludedBreedsAndSubBreeds.push(doc);
  });

  try {
    const moreDocs: UrlRatingData[] = await Dog.aggregate([
      {
        $match: {
          breed: {
            $nin: filteredExcludedBreedsAndSubBreeds.map((doc) => doc.breed),
          },
          subBreed: {
            $nin: filteredExcludedBreedsAndSubBreeds.map((doc) => doc.subBreed),
          },
        },
      },
      {
        $project: {
          breed: 1,
          urlSubBreed: {
            $zip: { inputs: ["$subBreed", "$urlData"], useLongestLength: true }, //plugs null into the shorter array
          },
        },
      },

      { $unwind: "$urlSubBreed" },
      {
        $lookup: {
          from: "urlratings",
          localField: "urlSubBreed.1",
          foreignField: "_id",
          as: "urlRatingData",
        },
      },
      {
        $unwind: "$urlRatingData",
      },

      { $sample: { size: sampleSize } },

      {
        $project: {
          _id: 0,
          breed: 1,
          subBreed: { $arrayElemAt: ["$urlSubBreed", 0] },
          url: "$urlRatingData.url",
          numberOfRates: "$urlRatingData.numberOfRates",
          userRatingData: "$urlRatingData.userRatingData",
          myRating: {
            $filter: {
              input: "$urlRatingData.userRatingData",
              as: "rating",
              cond: { $eq: ["$$rating.userId", id] },
            },
          },
          averageRating: {
            $avg: { $avg: "$urlRatingData.userRatingData.rating" },
          },
        },
      },
      {
        $project: {
          _id: 0,
          breed: 1,
          subBreed: 1,
          url: 1,
          numberOfRates: 1,

          myRating: {
            $arrayElemAt: [
              {
                $map: {
                  input: "$myRating",
                  as: "rating",
                  in: "$$rating.rating",
                },
              },
              0,
            ],
          },
          averageRating: 1,
        },
      },
    ]);

    return moreDocs;
  } catch (error: any) {
    throw new Error(error);
  }
}

export async function aggregateAllSorted(
  sortOrder: 1 | -1 = -1,
  sortMode: "averageRating" | "numberOfRates" | "breed" = "averageRating",
  skipCount: number = 0,
  sampleSize: number = 50,
  userId?: string,
  filteredBreed?: { breed: string; subBreed: string | null },
) {
  try {
    let id: Types.ObjectId | undefined = undefined;
    if (userId) id = new Types.ObjectId(userId);

    let breed: any = {};
    let subBreed: any = {};
    if (filteredBreed) {
      breed.breed = filteredBreed.breed;
      subBreed["urlSubBreed.0"] = filteredBreed.subBreed;
    }

    const secondMatch: any = {};
    if (sortMode === "averageRating") {
      secondMatch.averageRating = { $ne: null };
    }
    if (sortMode === "numberOfRates") {
      secondMatch.numberOfRates = { $gt: 0 };
    }

    const userRatings = await Dog.aggregate([
      { $match: breed },

      {
        $project: {
          breed: 1,
          urlSubBreed: {
            $zip: { inputs: ["$subBreed", "$urlData"], useLongestLength: true }, //plugs null into the shorter array
          },
        },
      },
      { $unwind: "$urlSubBreed" },
      { $match: subBreed },

      {
        $lookup: {
          from: "urlratings",
          localField: "urlSubBreed.1",
          foreignField: "_id",
          as: "urlRatingData",
        },
      },
      {
        $unwind: "$urlRatingData",
      },
      {
        $project: {
          _id: 0,
          breed: 1,
          subBreed: { $arrayElemAt: ["$urlSubBreed", 0] },
          url: "$urlRatingData.url",
          numberOfRates: "$urlRatingData.numberOfRates",

          myRating: {
            $filter: {
              input: "$urlRatingData.userRatingData",
              as: "rating",
              cond: { $eq: ["$$rating.userId", id] },
            },
          },
          averageRating: {
            $avg: { $avg: "$urlRatingData.userRatingData.rating" },
          },
        },
      },
      {
        $project: {
          _id: 0,
          breed: 1,
          subBreed: 1,
          url: 1,
          numberOfRates: 1,

          myRating: {
            $arrayElemAt: [
              {
                $map: {
                  input: "$myRating",
                  as: "rating",
                  in: "$$rating.rating",
                },
              },
              0,
            ],
          },
          averageRating: 1,
        },
      },
      {
        $sort: { [sortMode]: sortOrder, url: 1 },
      },
      {
        $match: {
          $and: [secondMatch],
        },
      },
      {
        $skip: skipCount,
      },
      {
        $limit: sampleSize,
      },
    ]);
    return userRatings;
  } catch (error: any) {
    throw new Error(error);
  }
}

//do matching for userId in random now

export async function aggreagateSingleUrl(url: string, userId: string) {
  try {
    const id = new Types.ObjectId(userId);
    const urlData = await UrlRating.aggregate([
      {
        $match: {
          url,
        },
      },

      {
        $project: {
          _id: 0,
          numberOfRates: 1,
          myRating: {
            $filter: {
              input: "$userRatingData",
              as: "rating",
              cond: { $eq: ["$$rating.userId", id] },
            },
          },
          averageRating: {
            $avg: { $avg: "$userRatingData.rating" },
          },
        },
      },
      {
        $project: {
          _id: 0,
          numberOfRates: 1,
          myRating: { $arrayElemAt: ["$myRating.rating", 0] },
          averageRating: 1,
        },
      },
    ]);

    return urlData[0];
  } catch (error: any) {
    throw new Error(error);
  }
}

export async function countUserAggregate(urlIdArray: string[]) {
  //get all user docs
  try {
    const match: any = {
      urlData: {
        $elemMatch: {
          $elemMatch: { $in: urlIdArray },
        },
      },
    };

    const totalCount = await UrlRating.countDocuments([{ $match: match }]);

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
    const { breed, subBreed } = filteredBreed;

    const matchingDocs = await Dog.aggregate([
      { $match: { breed: breed } },

      {
        $project: {
          breed: 1,
          urlSubBreed: {
            $zip: { inputs: ["$subBreed", "$urlData"], useLongestLength: true }, //plugs null into the shorter array
          },
        },
      },
      { $unwind: "$urlSubBreed" },
      { $match: { "urlSubBreed.0": subBreed } },

      {
        $lookup: {
          from: "urlratings",
          localField: "urlSubBreed.1",
          foreignField: "_id",
          as: "urlRatingData",
        },
      },
      {
        $unwind: "$urlRatingData",
      },
      {
        $project: {
          _id: 0,
          url: "$urlRatingData.url",
        },
      },
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
    const { breed, subBreed } = filteredBreed;
    const matchingDocs = await Dog.aggregate([
      { $match: { breed: breed } },
      {
        $project: {
          breed: 1,
          subBreed: 1,
          urlData: {
            $map: {
              input: "$urlData",
              as: "innerArray",
              in: {
                $filter: {
                  input: "$$innerArray",
                  as: "url",
                  cond: { $in: ["$$url", urlIdArray] },
                },
              },
            },
          },
        },
      },
      {
        $project: {
          breed: 1,
          urlSubBreed: {
            $zip: { inputs: ["$subBreed", "$urlData"], useLongestLength: true }, //plugs null into the shorter array
          },
        },
      },
      { $unwind: "$urlSubBreed" },
      { $match: { "urlSubBreed.0": subBreed } },

      {
        $lookup: {
          from: "urlratings",
          localField: "urlSubBreed.1",
          foreignField: "_id",
          as: "urlRatingData",
        },
      },
      {
        $unwind: "$urlRatingData",
      },
      {
        $project: {
          _id: 0,
          url: "$urlRatingData.url",
        },
      },
    ]);
    return matchingDocs.length;
  } catch (error: any) {
    throw new Error(error);
  }
}
// match.subBreed = { $arrayElemAt: { $eq: ["$subBreed", firstSubBreed] } };
// match.subBreed = {
//   $redact: {
//     $cond: [
//       {
//         $setIsSubset: [[`$${firstSubBreed}`], "$subBreed"],
//       },
//       "$$KEEP",
//       "$$PRUNE",
//     ],
//   },
// };
// match.subBreed = { $expr: { $in: [`$${firstSubBreed}`, "$subBreed"] } };
// const match: any = {};
// filteredBreeds.forEach((el) => {
//   const breed = el.breed;
//   const subBreed = el.subBreed;
//   if (breed) {
//     match.breed = { $in: breed };
//   }
//   if (subBreed) {
//     match.urlData = {
//       $elemMatch: {
//         $and: [
//           { $eq: [{ $arrayElemAt: ["$subBreed", 0] }, subBreed] },
//           { $ne: [null, { $arrayElemAt: ["$urlData", 0] }] },
//         ],
//       },
//     };
//   } else {
//     match.urlData = { $ne: [null, { $arrayElemAt: ["$urlData", 0] }] };
//   }
// });
