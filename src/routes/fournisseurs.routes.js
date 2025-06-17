const express = require("express");
const router = express.Router();
const supplierController = require("../controllers/fournisseurs.controller");
// const authMiddleware = require("../middlewares/auth.middleware");

// Routes fournisseurs
router.get("/", supplierController.getAllSuppliers);
router.post("/", supplierController.createSupplier);

module.exports = router;
