const express = require("express");
const router = express.Router();

const {
  listLowStock,
  getOrders,
  getOrderStats,
  getOrderDetails,
  submitReappro,
  cancelOrder,
  updateStatus
} = require("../controllers/reappro.controller");

const importedPart = require("../controllers/importation.controller");

// ✅ Routes spécifiques d'abord
router.get("/low-stock", listLowStock);
router.get("/stats", getOrderStats);
router.get("/importation", importedPart.getListeImportation);
router.get("/:importId/parts", importedPart.getImportedPart);

// ✅ Route POST pour soumettre une demande de réapprovisionnement
router.post("/", submitReappro);

// ✅ Route pour récupérer toutes les commandes
router.get("/", getOrders);

// ❗ Routes dynamiques à mettre à la fin
router.put('/:id/status', updateStatus);
router.get("/:id", getOrderDetails);
router.patch("/:id/cancel", cancelOrder);


// ✅ Tu peux ajouter des routes d'export Excel ici aussi
// router.get("/export/excel", exportToExcel);

module.exports = router;
