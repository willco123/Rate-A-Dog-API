import mongoose, { ConnectOptions } from "mongoose";

let mongoDB =
  process.env.NODE_ENV === "production"
    ? `mongodb+srv://${process.env.ATLAS_USER}:${process.env.ATLAS_PASSWORD}@${process.env.ATLAS_CLUSTER}/${process.env.ATLAS_DB_NAME}?retryWrites=true&w=majority`
    : `mongodb://127.0.0.1/${process.env.LOCAL_DB_NAME}`;

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
