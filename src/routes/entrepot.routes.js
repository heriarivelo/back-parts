// entrepot.routes.js
const express = require("express");
const router = express.Router();
const entrepot = require("../controllers/entrepot.controller");

router.post("/", entrepot.createEntrepot);
router.get("/", entrepot.getAllEntrepots);

router.get("/entrepot", entrepot.getStocksEntreposes);
router.get("/one", entrepot.findByCode_article);
router.put("/entrepots", entrepot.updateEntrepotStock);
// router.put("/entreports/import", entrepot.updateEntrepotStockListe);
// router.get("/entrepots", entrepot.getArticleEntrepots);
router.get("/entrepots/no", entrepot.getArticleNoEntrepots);
router.post("/transfer", entrepot.transferStock);

router.delete("/:id", entrepot.deleteEntrepot);

router.get("/stock/:productId", entrepot.produitIdEntrepots);

module.exports = router;
