import express, { Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import logger from "morgan";
import "../middleware/passport";
import indexRouter from "../routes/index";
import favouritesRouter from "../routes/favourites";
import usersRouter from "../routes/users";
import loginRouter from "../routes/login";
import dogsRouter from "../routes/dogs";
const app: Express = express();

app.use(logger("dev"));
app.use(
  cors({
    origin: "http://localhost:3000",
    // exposedHeaders: "Set-Cookie",
    exposedHeaders: "Authorization",
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.set("view engine", "ejs");
app.use(express.static("public")); //can access public files in browser

app.use("/", indexRouter);
app.use("/dogs/favourites", favouritesRouter);
app.use("/dogs", dogsRouter);
app.use("/users", usersRouter);
app.use("/", loginRouter);

app.get("/*", (req, res) => {
  res.sendFile(process.cwd() + "/public/index.html");
}); //catch all for bad route

export default app;
