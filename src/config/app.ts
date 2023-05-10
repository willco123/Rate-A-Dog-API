import express, { Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import logger from "morgan";
import "../middleware/passport";
import indexRouter from "../routes/index";
import usersRouter from "../routes/users";
import loginRouter from "../routes/login";
import dogsRouter from "../routes/dogs";
const app: Express = express();
const isDev = process.env.NODE_ENV !== "production";
const origin = isDev ? "http://localhost:3000" : "https://rateadog.netlify.app";

app.use(logger("dev"));
app.use(
  cors({
    origin: "https://rateadog.netlify.app",
    // exposedHeaders: "Set-Cookie",
    exposedHeaders: ["Authorization", "authorization"],
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.set("view engine", "ejs");
app.use(express.static("public")); //can access public files in browser

app.use("/", indexRouter);
app.use("/dogs", dogsRouter);
app.use("/", usersRouter);
app.use("/", loginRouter);

app.get("/*", (req, res) => {
  res.sendFile(process.cwd() + "/public/index.html");
}); //catch all for bad route

export default app;
