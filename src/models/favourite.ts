import mongoose, { Types } from "mongoose";
import { DBPopulatedFavourites } from "./types";
import { isNotNull } from "../utils/type-guards";

const Schema = mongoose.Schema;

const FavouriteSchema = new Schema({
  user: {
    type: Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  dogs: [
    {
      type: Types.ObjectId,
      ref: "Dog",
    },
  ],
});

export async function createFavouriteDoc(
  userObjectId: Types.ObjectId | string,
) {
  try {
    let myFavourite = new Favourite({ user: userObjectId });
    await myFavourite.save();
  } catch (err) {
    throw err;
  }
}

export async function saveFavouriteToDB(
  userObjectId: Types.ObjectId,
  dogObjectId: Types.ObjectId,
) {
  try {
    await Favourite.findOneAndUpdate(
      { user: userObjectId },
      { $addToSet: { dogs: dogObjectId } },
    );
  } catch (err) {
    throw err;
  }
}

export async function getFavourites(userObjectId: Types.ObjectId) {
  try {
    const myFavourites: DBPopulatedFavourites = await Favourite.findOne({
      user: userObjectId,
    }).populate("dogs");
    if (myFavourites == null) return null;
    const filteredArray = myFavourites.dogs.filter(isNotNull);
    return filteredArray;
  } catch (err) {
    throw err;
  }
}

export async function deleteFavouriteDog(
  userObjectId: Types.ObjectId,
  dogObjectId: Types.ObjectId,
) {
  try {
    await Favourite.findOneAndUpdate(
      { user: userObjectId },
      { $pull: { dogs: dogObjectId } },
    );
  } catch (err) {
    throw err;
  }
}

const Favourite = mongoose.model("Favourite", FavouriteSchema);

export default Favourite;
