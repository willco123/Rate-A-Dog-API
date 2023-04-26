import { Types } from "mongoose";

export const lookupUrlRating = {
  $lookup: {
    from: "urlratings",
    localField: "urls",
    foreignField: "_id",
    as: "urlData",
  },
};

export const matchUserId = (id: Types.ObjectId) => {
  return { $match: { _id: id } };
};

export const projectUrls = { $project: { urls: 1 } };

export const unwindUrlData = { $unwind: "$urlData" };

export const groupUrlWithRating = (id: Types.ObjectId) => {
  return {
    $group: {
      _id: "$_id",
      urlData: { $push: "$urlData._id" },
      //checkUrlRatingComb
      urls: { $push: "$urlData.url" },
      ratings: {
        $push: {
          $arrayElemAt: [
            {
              $filter: {
                input: "$urlData.userRatingData",
                as: "userRating",
                cond: { $eq: ["$$userRating.userId", id] },
              },
            },
            0,
          ],
        },
      },
    },
  };
};

export const checkUrlRatingComb = (id: Types.ObjectId) => {
  return {
    //just to check that each url is mapped to each rating
    urlRatings: {
      $push: {
        urls: "$urlData.url",
        ratings: {
          $arrayElemAt: [
            {
              $filter: {
                input: "$urlData.userRatingData",
                as: "userRating",
                cond: { $eq: ["$$userRating.userId", id] },
              },
            },
            0,
          ],
        },
      },
    },
  };
};

export const projectUrlsAndRatings = {
  $project: {
    urlData: 1,
    urls: 1,
    ratings: {
      $map: {
        input: "$ratings",
        as: "rating",
        in: "$$rating.rating",
      },
    },
  },
};
