// routes/proClientsRoutes.js
const express = require("express");
const router = express.Router();
const proClientsController = require("../controllers/proClients.controller.js");

// Routes pour les clients professionnels
router.get("/", proClientsController.getAllProClients);
router.get("/clients", proClientsController.getAllClients);
router.get("/clients-export", proClientsController.getClientsForExport);
router.get("/stats", proClientsController.getProClientsStats);
router.get("/clients/find-by-contact", proClientsController.findCustomerByContact);
router.post("/", proClientsController.createClient);
router.get("/:id", proClientsController.getClientDetails);
router.patch("/:id", proClientsController.updateClient);

module.exports = router;
