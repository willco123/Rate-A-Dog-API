import { Types } from "mongoose";

export type UserDetailsUi = {
  username: string;
  password: string;
  email: string;
};

export type Login = {
  username: string;
  password: string;
};

export type UserSearchQuery = {
  [key: string]: string | Types.ObjectId;
};

export type UserDetails = {
  _id: Types.ObjectId;
  username: string;
  password: string;
  email: string;
  rank: string;
  urls: Types.ObjectId[];
  token?: string;
} | null;

export type IdObj = {
  _id: Types.ObjectId;
};

export type FilteredDataNoNulls = {
  breed: string;
};

export type FilteredBreed =
  | { breed: string; subBreed: string | null }
  | undefined;

export type UrlRatingData = {
  breed: string;
  subBreed: string | null;
  url: string;
  numberOfRates: number;
  averageRating: number | null;
  myRating?: number | null;
};

export type UserUrlRatingData = {
  breed: string;
  subBreed: string | null;
  url: string;
  numberOfRates: number;
  averageRating: number | null;
  myRating: number | null;
};

export type SingleUrlOnRate = {
  numberOfRates: number;
  averageRating: number;
  myRating: number;
};

export type UrlRating = {
  _id: Types.ObjectId;
  url: string;
  numberOfRates: number;
  userRatingData: UsersRatingData[];
};
type UsersRatingData = {
  userId: string;
  rating: number | null;
};

export type TableData = {
  breed: string;
  subBreed: (string | null)[];
  averageRating: (number | null)[];
  numberOfRates: number[];
};

export type UserUrlData = { urls: string[] };
