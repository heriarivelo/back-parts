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

// Gestion des stocks
router.get("/products", getProducts);
router.get("/products/search", searchParts);
// router.patch("/stock/:productId", updateStock);
router.get("/stock/status", getStockStatus);

// Clients
router.get("/customers", getCustomers);
router.post("/customers", createCustomer);
router.get("/invoices", getInvoices);
// router.post("/invoices/:id/payments", addPayment);
router.get("/invoices/:id/print", printInvoice);

module.exports = router;
