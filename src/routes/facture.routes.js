// routes/stockMovement.js
const express = require("express");
const router = express.Router();
const {
  listFactures,
  updatePaymentStatus,
} = require("../controllers/facture.controller");

router.get("/", listFactures);
router.patch("/:invoiId/paiements", updatePaymentStatus);
// router.put("/", updateStock);

module.exports = router;
