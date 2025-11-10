const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// const {
//   getLowStockProducts,
//   createReappro,
// } = require("../services/reappro.service");
const OrderService = require("../services/reappro.service");

const getOrders = async (req, res, next) => {
  try {
    const {
      supplierId,
      search,
      page = 1,
      limit = 10,
      sortField,
      sortDirection,
    } = req.query;
    const result = await OrderService.getOrders({
      supplierId,
      search,
      page: parseInt(page),
      limit: parseInt(limit),
      sortField,
      sortDirection,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const getOrderStats = async (req, res, next) => {
  try {
    const stats = await OrderService.getOrderStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
};

const getOrderDetails = async (req, res, next) => {
  try {
    const order = await OrderService.getOrderDetails(parseInt(req.params.id));
    res.json(order);
  } catch (error) {
    next(error);
  }
};

const cancelOrder = async (req, res, next) => {
  try {
    const order = await OrderService.cancelOrder(parseInt(req.params.id));
    res.json(order);
  } catch (error) {
    next(error);
  }
};

// Liste des produits en stock faible
const listLowStock = async (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold) || 5;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const search = req.query.search || "";

    const result = await OrderService.getLowStockProducts(
      threshold,
      page,
      pageSize,
      search
    );
    res.json(result);
  } catch (error) {
    res
      .status(500)
      .json({ error: error.message || "Erreur interne du serveur" });
  }
};

// Soumission d'une demande de réapprovisionnement
const submitReappro = async (req, res) => {
  try {
    const { items, status, userId, totalValue } = req.body;

    console.log(totalValue);

    // const userId = req.user?.id; // Assurez-vous que req.user existe (middleware auth)

    if (!items || !items.length) {
      return res.status(400).json({ error: "Aucun produit sélectionné" });
    }

    // const reappro = await OrderService.createReappro(
    //   userId,
    //   items,
    //   status,
    //   totalValue
    // );
    const reappro = await OrderService.createReappro(
      items,
      status,
      userId,
      totalValue
      // supplierId peut être ajouté ici si nécessaire
    );
    res.status(201).json(reappro);
  } catch (error) {
    console.error(
      "Erreur lors de la soumission de réapprovisionnement :",
      error
    );
    res
      .status(400)
      .json({ error: error.message || "Erreur lors de la requête" });
  }
};

  const updateStatus = async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ message: "Le champ 'status' est requis." });
      }

      const updatedOrder = await OrderService.updateStatus(parseInt(id), status);
      res.status(200).json({
        message: 'Statut mis à jour avec succès.',
        order: updatedOrder
      });
    } catch (error) {
      console.error('Erreur updateStatus:', error);
      res.status(500).json({ message: 'Erreur lors de la mise à jour du statut.', error });
    }
  }

module.exports = {
  listLowStock,
  getOrders,
  getOrderStats,
  getOrderDetails,
  submitReappro,
  cancelOrder,
  updateStatus,
};
