import Joi from "joi";

type NewUser = {
  username: string;
  password: string;
  email: string;
};

export function validateNewUser(user: NewUser) {
  const schema = Joi.object({
    username: Joi.string().alphanum().min(5).max(50).required(),
    email: Joi.string().min(5).max(50).required().email(),
    password: Joi.string().min(5).max(255).required(),
  });
  return schema.validate(user);
}
