const express = require("express");
// const {
//   getOrSearch,
//   find_stock_detaille,
//   getDetailArticleVendu,
//   findByCode_article,
//   updateEntrepotStock,
//   getStocksEntreposes,
// } = require("../../controllers/parts/stocks.controller");
const router = express.Router();
const stockController = require("../../controllers/parts/stocks.controller");

// router.get("/", getOrSearch);
// router.get("/detail", find_stock_detaille);
// router.get("/vendu", getDetailArticleVendu);
// router.get("/entrepot", getStocksEntreposes);
// router.get("/one", findByCode_article);
// router.put("/", updateEntrepotStock);

router.get("/list", stockController.getStocks);
router.get("/analytics", stockController.getStockAnalytics);

module.exports = router;
