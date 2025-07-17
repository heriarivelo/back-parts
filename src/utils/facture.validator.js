const Joi = require("joi");

exports.annulerFactureValidation = Joi.object({
  factureId: Joi.number().integer().positive().required().messages({
    "number.base": "L'ID de la facture doit être un nombre.",
    "number.integer": "L'ID de la facture doit être un nombre entier.",
    "number.positive": "L'ID de la facture doit être positif.",
    "any.required": "L'ID de la facture est requis.",
  }),

  raison: Joi.string().trim().max(500).required().messages({
    "string.empty": "La raison de l'annulation est obligatoire.",
    "string.max": "La raison ne doit pas dépasser 500 caractères.",
    "any.required": "La raison de l'annulation est obligatoire.",
  }),
});
