import { RequestHandler } from "express";
import { validateNewUser } from "../utils/validators";
import { getUser } from "../models/user";
import bcrypt from "bcrypt";

export const authNewUser: RequestHandler = (req, res, next) => {
  const newUser: UserDetails = req.body;
  const { error } = validateNewUser(newUser);
  if (error) return res.status(400).send(error.details[0].message);
  next();
};

export const checkUniqueness: RequestHandler = async (req, res, next) => {
  const { username, email } = req.body;
  if (await getUser({ username: username }))
    return res.status(400).send("That Username is taken");
  if (await getUser({ email: email }))
    return res.status(400).send("That Email is taken");
  next();
};

export const login: RequestHandler = async (req, res, next) => {
  const { username, password }: Login = req.body;
  const user = await getUser({ username: username });
  if (!user) return res.status(400).send("Username or Password is incorrect");
  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword)
    return res.status(400).send("Username or Password is incorrect");
  res.locals.userObjectId = user._id; //Could pass more than the username here?
  next();
};
