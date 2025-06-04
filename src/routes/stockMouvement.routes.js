// routes/stockMovement.js
const express = require("express");
const router = express.Router();
const StockMovementController = require("../controllers/stockMouvement.controller");

// CRUD
router.post("/", StockMovementController.create);
router.get("/", StockMovementController.getStockMovements);
router.get("/:id", StockMovementController.getById);
router.get("/product/:productId", StockMovementController.getByProduct);
router.put("/:id", StockMovementController.update);
router.delete("/:id", StockMovementController.delete);

module.exports = router;
