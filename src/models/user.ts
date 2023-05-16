import mongoose, { Types } from "mongoose";
import isEmail from "validator/lib/isEmail";
import {
  lookupUrlRating,
  matchUserId,
  projectUrls,
  unwindUrlData,
  groupUrlWithRating,
  projectUrlsAndRatings,
} from "../utils/aggregate-pipeline/user-aggregates";
import {
  UserDetailsUi,
  UserSearchQuery,
  UserDetails,
  IdObj,
  UserUrlData,
} from "../types";
import _ from "lodash";
import { isNotNull } from "../utils/type-guards";

const Schema = mongoose.Schema;

const UserSchema = new Schema({
  username: { type: String, required: true, maxLength: 50, unique: true },
  password: { type: String, required: true, maxLength: 255 },
  email: {
    type: String,
    required: true,
    maxLength: 255,
    validate: [isEmail, "invalid email"],
    unique: true,
  },
  rank: {
    type: String,
    required: true,
    maxLength: 255,
    enum: ["admin", "user"],
    default: "user",
  },
  token: {
    type: String,
    index: {
      partialFilterExpression: { token: { $type: "string" } },
    },
  },

  urls: {
    type: Array,
    of: Types.ObjectId,
    maxLength: 254,
    ref: "UrlRating",
  },
});

const User = mongoose.model("User", UserSchema);

export async function saveUserToDB(newUser: UserDetailsUi) {
  try {
    const aUser = new User(newUser);
    const savedUser: UserDetails = await aUser.save();
    return savedUser;
  } catch (err: any) {
    throw err;
  }
}

export async function getAllUsersFromDB() {
  try {
    const users: UserDetails[] = await User.find({});
    const filteredArray = users.filter(isNotNull);
    return filteredArray;
  } catch (err) {
    throw err;
  }
}

export async function getUser(userQuery: UserSearchQuery) {
  try {
    const user: UserDetails = await User.findOne(userQuery);
    return user;
  } catch (err) {
    throw err;
  }
}

export async function saveToken(token: string, userObjectId: string | IdObj) {
  try {
    await User.findOneAndUpdate({ _id: userObjectId }, { token: token });
  } catch (err: any) {
    throw err;
  }
}

export async function deleteToken(userObjectId: string | IdObj) {
  try {
    await User.findOneAndUpdate(
      { _id: userObjectId },
      { $unset: { token: "" } },
    );
  } catch (err: any) {
    throw err;
  }
}

export async function getToken(userObjectId: string | IdObj) {
  try {
    const user: UserDetails = await User.findOne({ _id: userObjectId });
    if (!user) return null;
    return user.token;
  } catch (err: any) {
    throw err;
  }
}

export async function saveUrlIdToUser(urlId: Types.ObjectId, userId: string) {
  try {
    const user: UserDetails = await User.findOneAndUpdate(
      { _id: userId },
      { $addToSet: { urls: urlId } },
      { new: true },
    );
    if (!user) return null;

    return user;
  } catch (err: any) {
    throw err;
  }
}

export async function getUserUrlRatings(userId: string) {
  try {
    const id = new Types.ObjectId(userId);
    const userUrls: UserUrlData[] = await User.aggregate([
      matchUserId(id),
      projectUrls,
      lookupUrlRating,
      unwindUrlData,
      groupUrlWithRating(id),
      projectUrlsAndRatings,
    ]);
    //assuming the above code gives a 1-1 mapping of urls to ratings then it should be fine
    //assumption: group goes through each urlId and pushes rating and url at the same index
    return userUrls[0];
  } catch (err: any) {
    throw err;
  }
}

export async function getUserUrls(userId: string) {
  try {
    const id = new Types.ObjectId(userId);
    const userUrls: UserUrlData[] = await User.aggregate([
      { $match: { _id: id } },
      { $project: { _id: 0, urls: 1 } },
    ]);
    return userUrls[0].urls;
  } catch (err: any) {
    throw err;
  }
}
export async function deleteUser(userId: string | Types.ObjectId) {
  try {
    User.deleteOne({ _id: userId });
  } catch (error) {
    throw new Error("Error deleting user");
  }
}

// export async function updateUser(
//   username: UsernameObj,
//   fieldsToUpdate: UpdateFields,
// ) {
//   fieldsToUpdate;
//   //admin only
//   User.updateOne(username, {
//     $set: fieldsToUpdate,
//   });
// }
