// routes/stockMovement.js
const express = require("express");
const router = express.Router();
const {
  getPriceHistory,
  updatePrixPiece,
} = require("../controllers/historiquePrix.controller");

router.get("/:productId/price-history", getPriceHistory);
router.patch("/:productId", updatePrixPiece);

module.exports = router;
