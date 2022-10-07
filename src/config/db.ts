import mongoose, { ConnectOptions } from "mongoose";

//Set up default mongoose connection
const mongoDB =
  process.env.NODE_ENV === "test"
    ? "mongodb://localhost:27017/test_dog_database"
    : `mongodb+srv://${process.env.ATLAS_USER}:${process.env.ATLAS_PASSWORD}@willcocluster.imgveza.mongodb.net/?retryWrites=true&w=majority`;
mongoose
  .connect(mongoDB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  } as ConnectOptions)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));

export default db;
