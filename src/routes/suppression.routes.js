const express = require("express");
const router = express.Router();
const cleanDatabase = require("../controllers/suppression.controller");

// Route pour nettoyer la base de données (sauf la table User)
router.delete("/clear-database", cleanDatabase.cleanDb);

module.exports = router;
