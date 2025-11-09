const express = require("express");
const router = express.Router();
const orderController = require("../controllers/commande.controller");

router.post("/preview", orderController.previewInvoice);
router.post("/", orderController.createOrders);
// router.post("/creersansfacture", orderController.createCommande);
router.get("/", orderController.getCommandesHistorique);
router.get("/all", orderController.getAllCommandes);
router.get("/:id", orderController.getOrderDetails);
router.post("/:orderId/validate", orderController.validateOrder);
router.get('/:orderId/details', orderController.getClientProCommandeWithDetails);

module.exports = router;
