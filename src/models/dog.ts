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
    console.log(err);
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

const zipSubBreedAndUrlIds = {
  $project: {
    breed: 1,
    urlSubBreed: {
      $zip: { inputs: ["$subBreed", "$urlData"], useLongestLength: true }, //plugs null into the shorter array
    },
  },
};
const matchBreed = (breed: string) => {
  return {
    $match: {
      breed: breed,
    },
  };
};

const projectUrlsAssociatedWithSubBreed = (index: number) => {
  return {
    $project: {
      ratingArray: { $arrayElemAt: ["$urlData", index] }, // access the item at the specified index, which will be associated witha subBreed
    },
  };
};

const lookupUrlratings = {
  $lookup: {
    //get refs in doc
    from: "urlratings",
    localField: "ratingArray",
    foreignField: "_id",
    as: "rating_docs",
  },
};

const groupAndAverage = {
  $group: {
    //group and average all ratings/numberOfRates
    _id: "$rating_docs._id",
    avgRating: { $avg: "$rating_docs.userRatingData.rating" },
    rates: { $sum: "$rating_docs.numberOfRates" },
    url: { $addToSet: "$rating_docs.url" },
  },
};

const projectSubBreedAggregate = {
  $project: {
    avgRating: 1,
    rates: 1,
    url: 1,
    _id: 0,
  },
};

const unwindUrlRatings = { $unwind: "$rating_docs" };
const unwindUserRatingData = { $unwind: "$rating_docs.userRatingData" };

export async function aggregateBySubBreed(index: number, breed: string) {
  const urlAggregatesBySubBreed = await Dog.aggregate([
    //outputs all urls and their average ratings and votes, grouped by subBreed
    matchBreed(breed),
    projectUrlsAssociatedWithSubBreed(index),
    lookupUrlratings,
    unwindUrlRatings,
    unwindUserRatingData, //expand arrays
    groupAndAverage,
    projectSubBreedAggregate,
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

export async function aggregateAll() {
  try {
    const allRatings = await Dog.aggregate([
      zipSubBreedAndUrlIds,
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
      {
        $group: {
          _id: { urlSubBreed: "$urlSubBreed" },
          breed: { $addToSet: "$breed" },
          urlRatings: {
            $push: {
              avgRating: { $avg: "$urlRatingData.userRatingData.rating" },
              url: "$urlRatingData.url",
              numberOfRates: "$urlRatingData.numberOfRates",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          breed: { $arrayElemAt: ["$breed", 0] },
          subBreed: { $arrayElemAt: ["$_id.urlSubBreed", 0] },
          urlRatings: 1,
        },
      },
    ]);

    return allRatings;
  } catch (error: any) {
    throw new Error(error);
  }
}

export async function aggregateAllGroupBySubBreed() {
  const allRatingsAggregate = await Dog.aggregate([
    //outputs all urls and their average ratings and votes, grouped by subBreed

    zipSubBreedAndUrlIds,

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
    {
      $group: {
        _id: { urlSubBreed: "$urlSubBreed" },
        breed: { $addToSet: "$breed" },
        // avgRating: {//unsure how to average an array of arrays
        //   $avg: { $arrayElemAt: ["$urlRatingData.userRatingData.rating", 0] },
        // },
        rating: {
          $push: "$urlRatingData.userRatingData.rating",
        },

        numberOfRates: { $sum: "$urlRatingData.numberOfRates" },
        url: { $addToSet: "$urlRatingData.url" },
      },
    },
    {
      $project: {
        _id: 0,
        breed: 1,
        subBreed: { $arrayElemAt: ["$_id.urlSubBreed", 0] },
        rating: 1,
        numberOfRates: 1,
        test: 1,
        url: 1,
      },
    },
  ]);

  const output = allRatingsAggregate.map((element) => {
    const outputRatings = element.rating.flat(1);
    element.breed = element.breed[0];
    element.rating = averageRatings(outputRatings);
    return element;
  });

  return output;
}

export function averageRatings(myArray: number[]) {
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

export async function aggregateUserRatingsGroupBySubBreed(
  urlIdArray: string,
  userId: string,
) {
  try {
    const id = new Types.ObjectId(userId);
    const userRatings = await Dog.aggregate([
      {
        $match: {
          urlData: {
            $elemMatch: {
              $elemMatch: { $in: urlIdArray },
            },
          },
        },
      },
      zipSubBreedAndUrlIds,

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
      {
        $group: {
          _id: { urlSubBreed: "$urlSubBreed" },
          breed: { $addToSet: "$breed" },
          urlRatings: {
            $push: {
              userRating: {
                $arrayElemAt: [
                  {
                    $filter: {
                      input: "$urlRatingData.userRatingData",
                      as: "userRating",
                      cond: { $eq: ["$$userRating.userId", id] },
                    },
                  },
                  0,
                ],
              },
              url: "$urlRatingData.url",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          breed: 1,
          subBreed: { $arrayElemAt: ["$_id.urlSubBreed", 0] },
          urlRatings: {
            $filter: {
              input: "$urlRatings",
              as: "rating",
              cond: {
                $eq: [{ $type: "$$rating.userRating" }, "object"],
              },
            },
          },
        },
      },

      {
        $project: {
          breed: { $arrayElemAt: ["$breed", 0] },
          subBreed: 1,
          urlRatings: {
            $map: {
              input: "$urlRatings",
              as: "rating",
              in: ["$$rating.userRating.rating", "$$rating.url"],
            },
          },
        },
      },
    ]);

    return userRatings;
  } catch (error: any) {
    throw new Error(error);
  }
}

export async function aggregateUserRatingsRandom(
  urlIdArray: string,
  userId: string,
) {
  try {
    const id = new Types.ObjectId(userId);
    const userRatings = await Dog.aggregate([
      {
        $match: {
          urlData: {
            $elemMatch: {
              $elemMatch: { $in: urlIdArray },
            },
          },
        },
      },
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
    ]);

    return userRatings;
  } catch (error: any) {
    throw new Error(error);
  }
}

export async function aggregateRandomDocs(sampleSize: number) {
  try {
    const fiftyDocs: UrlRatingData[] = await Dog.aggregate([
      zipSubBreedAndUrlIds,

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

          averageRating: {
            $avg: { $avg: "$urlRatingData.userRatingData.rating" },
          },
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
) {
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

          averageRating: {
            $avg: { $avg: "$urlRatingData.userRatingData.rating" },
          },
        },
      },
    ]);

    return moreDocs;
  } catch (error: any) {
    throw new Error(error);
  }
}
