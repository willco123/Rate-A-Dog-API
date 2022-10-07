import mongoose, { Types } from "mongoose";
import { Dog, DBDog } from "./types";
import { isNotNull } from "../utils/type-guards";

const Schema = mongoose.Schema;

const DogSchema = new Schema({
  url: { type: String, required: true, maxLength: 254, unique: true },
  breed: { type: String, required: true, maxLength: 100 },
  rating: { type: Number, min: 0, max: 10, default: 0 },
  numberOfRates: { type: Number, default: 0 },
});

export async function saveDogToDB(dog: Dog) {
  try {
    let aDog = new Dog(dog);
    const savedDog: DBDog = await aDog.save();
    return savedDog;
  } catch (err) {
    throw err;
  }
}

export async function getDogByUrlDB(url: string) {
  try {
    const dog: DBDog = await Dog.findOne({ url: url });
    return dog;
  } catch (err) {
    throw err;
  }
}

export async function getAllDogsDB() {
  try {
    const dogs: Array<DBDog> = await Dog.find({});
    const filteredArray = dogs.filter(isNotNull);
    return filteredArray;
  } catch (err) {
    throw err;
  }
}

export async function rateDogDB(
  dogObjectId: Types.ObjectId,
  newRating: number,
) {
  try {
    const dog: DBDog = await Dog.findOneAndUpdate(
      { _id: dogObjectId },
      { $inc: { numberOfRates: 1 } },
      { returnDocument: "after" },
    );

    if (dog == null) return null;
    const { numberOfRates, rating } = dog;

    const newMean = updateAverage(numberOfRates, rating, newRating);

    await Dog.findOneAndUpdate(
      { _id: dogObjectId },
      { $set: { rating: newMean } },
    );
  } catch (err) {
    throw err;
  }
}

function updateAverage(n: number, runningMean: number, newRating: number) {
  const newMean = runningMean + (newRating - runningMean) / n;
  return newMean;
}

const Dog = mongoose.model("Dog", DogSchema);

export default Dog;
