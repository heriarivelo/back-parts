// routes/stockMovement.js
const express = require("express");
const router = express.Router();
const {
  getStockStatus,
  // updateStock,
  getStockAnalytics,
  getAvailableProducts,
  getAllStocks,
} = require("../controllers/stock.controller");

router.get("/", getStockStatus);
// router.put("/", updateStock);
router.get("/list", getAllStocks); // pour le stock admin merci
router.get("/analytics", getStockAnalytics);
router.get("/available", getAvailableProducts);

module.exports = router;
