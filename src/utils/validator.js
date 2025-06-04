const Joi = require("joi");

exports.registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid("USER", "ADMIN", "MANAGER", "CLIENT").optional(),
});

exports.loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

exports.updateUserSchema = Joi.object({
  name: Joi.string().min(2),
  email: Joi.string().email(),
  role: Joi.string().valid("USER", "CLIENT", "ADMIN", "MANAGER"),
  password: Joi.string().min(6).forbidden(), // L'admin ne peut pas modifier le mot de passe directement
}).min(1);
