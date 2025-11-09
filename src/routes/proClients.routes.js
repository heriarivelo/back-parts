// routes/proClientsRoutes.js
const express = require("express");
const router = express.Router();
const proClientsController = require("../controllers/proClients.controller.js");

// Routes pour les clients professionnels
router.get("/", proClientsController.getAllProClients);
router.get("/stats", proClientsController.getProClientsStats);
router.post("/", proClientsController.createProClient);
router.get("/:id", proClientsController.getClientDetails);
router.patch("/:id", proClientsController.updateProClient);

module.exports = router;
