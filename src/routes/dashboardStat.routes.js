// routes/stockMovement.js
const express = require("express");
const router = express.Router();
const {
  getDashboardStats,
  getDashboardStatistique,
} = require("../controllers/dashboardStat.controller");

router.get("/stats", getDashboardStats);
router.get("/statistiques", getDashboardStatistique);

module.exports = router;
