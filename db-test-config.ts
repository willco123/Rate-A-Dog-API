import mongoose, { ConnectOptions } from "mongoose";

const mongoDB = "mongodb://127.0.0.1/";

const connectDatabase = async (dbInstance: string) => {
  try {
    await mongoose.connect(mongoDB + dbInstance, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    } as ConnectOptions);

    const db = mongoose.connection;
    db.on("error", console.error.bind(console, "MongoDB connection error:"));
    return db;
  } catch (error) {
    console.error(error);
  }
};

export default connectDatabase;
