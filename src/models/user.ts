import mongoose, { Types } from "mongoose";
import isEmail from "validator/lib/isEmail";
import { UserDetails, UserSearchQuery, DBUserDetails, IdObj } from "./types";
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

export async function saveUserToDB(newUser: UserDetails) {
  try {
    const aUser = new User(newUser);
    const savedUser: DBUserDetails = await aUser.save();
    return savedUser;
  } catch (err: any) {
    throw err;
  }
}

export async function getAllUsersFromDB() {
  try {
    const users: DBUserDetails[] = await User.find({});
    const filteredArray = users.filter(isNotNull);
    return filteredArray;
  } catch (err) {
    throw err;
  }
}

export async function getUser(userQuery: UserSearchQuery) {
  try {
    const user: DBUserDetails = await User.findOne(userQuery);
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
    const user = await User.findOne({ _id: userObjectId });
    if (!user) return null;
    return user.token;
  } catch (err: any) {
    throw err;
  }
}

export async function saveUrlIdToUser(urlId: Types.ObjectId, userId: string) {
  try {
    const user = await User.findOneAndUpdate(
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

// export async function deleteUserByUsername(username: UsernameObj) {
//   //admin only
//   User.deleteOne(username);
// }

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
