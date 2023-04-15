import { Types } from "mongoose";

export type SearchFields = { _id: Types.ObjectId } | { breed: string };

export type UserDetails = {
  username: string;
  password: string;
  email: string;
};

export type Dog = {
  url: string;
  breed: string;
  subBreed?: string;
  rating?: number;
};

export type SaveNewDog = {
  breed: string;
  subBreed?: string;
};

export type UserSearchQuery = {
  [key: string]: string | Types.ObjectId;
};

export type DBDog = {
  _id: Types.ObjectId;
  url: string[];
  breed: string;
  subBreed: string[];
  rating: number[];
  numberOfRates: number[];
} | null;

export type DBUserDetails = {
  _id: Types.ObjectId;
  username: string;
  password: string;
  email: string;
  rank: string;
} | null;

export type DBPopulatedFavourites = {
  _id: string;
  user: string;
  dogs: DBDog[];
} | null;

export type DBFavourites = {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  dogs: Types.ObjectId[];
} | null;

export type IdObj = {
  _id: Types.ObjectId;
};
// export type UpdateFields = {
//   username?: string;
//   password?: string;
//   email?: string;
//   rank?: string;
// };

// export type UsernameObj = {
//   username: string;
// };

// export type EmailObj = {
//   email: string;
// };

// export type UrlObj = {
//   url: string;
// };

// export type UserObjId = {
//   user: Types.ObjectId;
// };

// export type UserSearchQuery = UsernameObj | EmailObj | IdObj;

export type UrlRatingData = {
  breed: string;
  subBreed: string | null;
  url: string;
  numberOfRates: number;
  userRatingData: UrlUserRatingData[];
  averageRating: number | null;
} | null;

export type FilteredDataNoNulls = {
  breed: string;
  subBreed: string | null;
};

type UrlUserRatingData = {
  url: string;
  rating: number | null;
};
