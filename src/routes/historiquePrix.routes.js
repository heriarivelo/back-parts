// routes/stockMovement.js
const express = require("express");
const router = express.Router();
const {
  getPriceHistory,
  updatePrixPiece,
  handleGetStockByImport,
} = require("../controllers/historiquePrix.controller");

router.get("/:productId/price-history", getPriceHistory);
router.get("/by-import/:productId", handleGetStockByImport);
router.patch("/:productId", updatePrixPiece);

module.exports = router;
