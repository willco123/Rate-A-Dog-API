import { Types } from "mongoose";

export type TokenContents = {
  userPayload: Types.ObjectId;
  expiration: Types.ObjectId;
};

export type UserDetails = {
  username: string;
  password: string;
  email: string;
};

// export type UserFavourites = {
//   url: string;
//   breed: string;
//   rating: number;
// };

export type Dog = {
  url: string;
  breed: string;
  rating?: number;
};
