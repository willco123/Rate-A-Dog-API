import type {
  FilteredBreed,
  FilteredDataNoNulls,
  UrlRatingData,
} from "../../types";
import type { Types } from "mongoose";

export const matchUserUrls = (urlIdArray: string[]) => {
  return {
    $match: {
      urlData: {
        $elemMatch: {
          $elemMatch: { $in: urlIdArray },
        },
      },
    },
  };
};

export const matchBreedFilter = (filteredBreed: FilteredBreed) => {
  if (filteredBreed) {
    return { $match: { breed: filteredBreed.breed } };
  }
  return { $match: {} };
};

export const matchSubBreedFilter = (filteredBreed: FilteredBreed) => {
  const subBreed: any = {};
  if (filteredBreed) {
    subBreed["urlSubBreed.0"] = filteredBreed.subBreed;
  }
  return { $match: subBreed };
};

export const excludeBreeds = (currentlyLoadedDocuments: UrlRatingData[]) => {
  const excludedBreeds = currentlyLoadedDocuments.map((doc) => {
    if (!doc) return doc;
    return {
      breed: doc.breed,
    };
  });

  const filteredExcludedBreeds: FilteredDataNoNulls[] = [];
  excludedBreeds.forEach((doc) => {
    if (doc) filteredExcludedBreeds.push(doc);
  });
  {
    return {
      $match: {
        breed: {
          $nin: filteredExcludedBreeds.map((doc) => doc.breed),
        },
      },
    };
  }
};

export const excludeNonZero = (sortMode: string) => {
  const secondMatch: any = {};
  if (sortMode === "averageRating") {
    secondMatch.averageRating = { $ne: null };
  }
  if (sortMode === "numberOfRates") {
    secondMatch.numberOfRates = { $gt: 0 };
  }
  return { $match: secondMatch };
};

export const matchUrl = (url: string) => {
  return { $match: { url } };
};

export const projectMatchingUserUrls = (urlIdArray: string[]) => {
  return {
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
  };
};

export const projectStandardFormat = (id: Types.ObjectId) => {
  return {
    $project: {
      _id: 0,
      breed: 1,
      subBreed: { $arrayElemAt: ["$urlSubBreed", 0] },
      url: "$urlRatingData.url",
      numberOfRates: "$urlRatingData.numberOfRates",
      //userRatingData: "$urlRatingData.userRatingData",
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
  };
};

export const projectStandardFormatNoUser = {
  $project: {
    _id: 0,
    breed: 1,
    subBreed: { $arrayElemAt: ["$urlSubBreed", 0] },
    url: "$urlRatingData.url",
    numberOfRates: "$urlRatingData.numberOfRates",
    averageRating: {
      $avg: { $avg: "$urlRatingData.userRatingData.rating" },
    },
  },
};

export const projectTidyUpMyRatings = {
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
};

export const projectAndZipSubBreedUrlArrays = {
  $project: {
    breed: 1,
    urlSubBreed: {
      $zip: { inputs: ["$subBreed", "$urlData"], useLongestLength: true }, //plugs null into the shorter array
    },
  },
};

export const projectSingleUrlOnRate = (id: Types.ObjectId) => {
  return {
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
  };
};

export const projectSingleUrlTidyUpMyRating = {
  $project: {
    _id: 0,
    numberOfRates: 1,
    myRating: { $arrayElemAt: ["$myRating.rating", 0] },
    averageRating: 1,
  },
};

export const projectUrlsForCount = {
  $project: {
    _id: 0,
    url: "$urlRatingData.url",
  },
};

export const projectSubBreedForGroup = {
  $project: {
    breed: 1,
    subBreed: { $arrayElemAt: ["$urlSubBreed", 0] },
    urlRatingData: 1,
  },
};

export const projectTidyUpGroupedSubBreeds = {
  $project: {
    _id: 0,
    breed: "$_id.breed",
    subBreed: "$_id.subBreed",
    averageRating: 1,
    numberOfRates: 1,
  },
};

export const groupBySubBreed = {
  $group: {
    _id: {
      breed: "$breed",
      subBreed: "$subBreed",
    },
    averageRating: {
      $avg: { $avg: "$urlRatingData.userRatingData.rating" },
    },
    numberOfRates: { $sum: "$urlRatingData.numberOfRates" },
  },
};

export const unwindUrlSubBreed = { $unwind: "$urlSubBreed" };

export const unwindUrlRatingData = {
  $unwind: "$urlRatingData",
};

export const lookupUrlRatingDataFromZip = {
  $lookup: {
    from: "urlratings",
    localField: "urlSubBreed.1",
    foreignField: "_id",
    as: "urlRatingData",
  },
};

export const sortAndBiasByUrl = (sortOrder: number, sortMode: string) => {
  return { $sort: { [sortMode]: sortOrder as any, url: 1 } };
};

export const skipByCount = (skipCount: number) => {
  return {
    $skip: skipCount,
  };
};

export const limitBySampleSize = (sampleSize: number) => {
  return {
    $limit: sampleSize,
  };
};

export const randomSample = (sampleSize: number) => {
  return {
    $sample: { size: sampleSize },
  };
};

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
