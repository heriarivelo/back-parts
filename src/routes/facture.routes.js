// routes/stockMovement.js
const express = require("express");
const router = express.Router();
const {
  listFactures,
  updatePaymentStatus,
  annulationFacture,
} = require("../controllers/facture.controller");
// const { annulerFactureValidation } = require("../utils/facture.validator");

router.get("/", listFactures);
router.patch("/:invoiId/paiements", updatePaymentStatus);
// router.put("/", updateStock);
router.patch("/:invoiId/annuler", annulationFacture);

module.exports = router;
