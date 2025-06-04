const express = require("express");
const {
  // createOrder,
  getProducts,
  // createInvoice,
  getInvoices,
  getCustomers,
  // addPayment,
  // generateFullInvoice,
  searchParts,
  // getOrderDetails,
  // updatePaymentStatus,
  printInvoice,
  createCustomer,
} = require("../controllers/manager.controller.js");
const {
  updateStock,
  getStockStatus,
} = require("../controllers/stock.controller.js");
// import { authenticate, checkManagerRole } from "../middleware/auth.js";
const router = express.Router();

// Middleware pour toutes les routes MANAGER
// router.use(authenticate, checkManagerRole);

// Gestion des ventes
// router.post("/orders", createOrder);
// router.get("/orders/:id", getOrderDetails);

// Gestion des stocks
router.get("/products", getProducts);
router.get("/products/search", searchParts);
// router.patch("/stock/:productId", updateStock);
router.get("/stock/status", getStockStatus);

// Facturation
// router.post("/invoices", createInvoice);
// router.patch("/invoices/:id/payment", updatePaymentStatus);

// Clients
router.get("/customers", getCustomers);
router.post("/customers", createCustomer);

// Facturation
// router.post("/invoices/full", generateFullInvoice);
router.get("/invoices", getInvoices);
// router.post("/invoices/:id/payments", addPayment);
router.get("/invoices/:id/print", printInvoice);

// Ajoutez cette route GET
// router.get("/orders/:id", getOrderDetails);

module.exports = router;
