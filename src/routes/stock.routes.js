// routes/stockMovement.js
const express = require("express");
const router = express.Router();
const {
  getStockStatus,
  // updateStock,
  getStockAnalytics,
  getAvailableProducts,
  getAllStocks,
  getProductDistribution,
  updateStockDistribution,
  getAllStocksWithoutPagination
} = require("../controllers/stock.controller");

router.get("/", getStockStatus);
// router.put("/", updateStock);
router.get("/list", getAllStocks); // pour le stock admin merci
router.get("/all", getAllStocksWithoutPagination);
router.get("/analytics", getStockAnalytics);
router.get("/available", getAvailableProducts);
router.post("/distribution", updateStockDistribution);
router.get("/products/:productId/distribution", getProductDistribution);

module.exports = router;
