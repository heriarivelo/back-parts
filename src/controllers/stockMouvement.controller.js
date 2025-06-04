const StockMovementService = require("../services/stockMouvement.service");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const StockMovementController = {
  async getStockMovements(req, res) {
    try {
      const {
        productId,
        startDate,
        endDate,
        type,
        page = 1,
        limit = 20,
      } = req.query;

      const where = {
        productId: productId ? parseInt(productId) : undefined,
        type: type ? type : undefined,
        createdAt: {
          gte: startDate ? new Date(startDate) : undefined,
          lte: endDate ? new Date(endDate) : undefined,
        },
      };

      const [movements, total] = await Promise.all([
        prisma.stockMovement.findMany({
          where,
          include: {
            product: {
              select: {
                referenceCode: true,
                libelle: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          skip: (parseInt(page) - 1) * parseInt(limit),
          take: parseInt(limit),
        }),
        prisma.stockMovement.count({ where }),
      ]);

      res.json({
        data: movements,
        meta: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      });
    } catch (error) {
      console.error("Error fetching stock movements:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  async createStockMovement(req, res) {
    try {
      const { productId, type, quantity, source, reason } = req.body;

      // Validation
      if (
        ![
          "IMPORT",
          "SALE",
          "RETURN",
          "ADJUSTMENT",
          "TRANSFER",
          "LOSS",
        ].includes(type)
      ) {
        return res.status(400).json({ error: "Type de mouvement invalide" });
      }

      const movement = await prisma.$transaction(async (tx) => {
        // 1. Créer le mouvement
        const newMovement = await tx.stockMovement.create({
          data: {
            productId: parseInt(productId),
            type,
            quantity: parseFloat(quantity),
            source,
            reason,
          },
        });

        // 2. Mettre à jour le stock global
        let updateOperation = {};
        switch (type) {
          case "IMPORT":
          case "RETURN":
            updateOperation = { increment: parseFloat(quantity) };
            break;
          case "SALE":
          case "LOSS":
            updateOperation = { decrement: parseFloat(quantity) };
            break;
          // TRANSFER et ADJUSTMENT nécessitent une logique plus complexe
        }

        if (["IMPORT", "SALE", "RETURN", "LOSS"].includes(type)) {
          await tx.stock.updateMany({
            where: { productId: parseInt(productId) },
            data: { quantite: updateOperation },
          });
        }

        return newMovement;
      });

      res.status(201).json(movement);
    } catch (error) {
      console.error("Error creating stock movement:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // simple crud mbola tsy nampiasaina manomboka eto
  async create(req, res) {
    try {
      const mouvement = await StockMovementService.create(req.body);
      res.status(201).json(mouvement);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async getAll(req, res) {
    try {
      const mouvements = await StockMovementService.getAll();
      res.json(mouvements);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async getById(req, res) {
    try {
      const mouvement = await StockMovementService.getById(req.params.id);
      if (!mouvement)
        return res.status(404).json({ error: "Mouvement non trouvé" });
      res.json(mouvement);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async getByProduct(req, res) {
    try {
      const mouvements = await StockMovementService.getByProduct(
        req.params.productId
      );
      res.json(mouvements);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async update(req, res) {
    try {
      const mouvement = await StockMovementService.update(
        req.params.id,
        req.body
      );
      res.json(mouvement);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async delete(req, res) {
    try {
      await StockMovementService.delete(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // stock mouvement pour le commande et tout ce qui le concerne

  async validerCommande(commandeId) {
    const commande = await prisma.commandeVente.findUnique({
      where: { id: commandeId },
      include: { pieces: true },
    });

    if (!commande) throw new Error("Commande introuvable");

    if (commande.status !== "EN_ATTENTE" && commande.status !== "TRAITEMENT") {
      throw new Error("Commande déjà livrée ou annulée");
    }

    // Mettre à jour le statut
    await prisma.commandeVente.update({
      where: { id: commandeId },
      data: { status: "LIVREE" },
    });

    // Enregistrer les mouvements de stock
    for (const item of commande.pieces) {
      await StockMovementService.create({
        productId: item.productId,
        type: "SALE",
        quantity: item.quantite,
        source: `COMMANDE#${commandeId}`,
        reason: "Validation de commande",
      });

      // Diminuer le stock du produit
      await prisma.stock.update({
        where: { productId: item.productId },
        data: {
          quantite: { decrement: item.quantite },
          quantiteVendu: { increment: item.quantite },
        },
      });
    }

    return true;
  },

  async annulerCommande(commandeId) {
    const commande = await prisma.commandeVente.findUnique({
      where: { id: commandeId },
      include: {
        pieces: true,
      },
    });

    if (!commande) throw new Error("Commande introuvable");

    if (commande.status !== "LIVREE") {
      throw new Error("Seules les commandes livrées peuvent être annulées");
    }

    // Mettre à jour le statut de la commande
    await prisma.commandeVente.update({
      where: { id: commandeId },
      data: {
        status: "ANNULEE",
      },
    });

    // Enregistrer les retours et réajuster le stock
    for (const item of commande.pieces) {
      await StockMovementService.create({
        productId: item.productId,
        type: "RETURN",
        quantity: item.quantite,
        source: `COMMANDE#${commandeId}`,
        reason: "Annulation de commande livrée",
      });

      // Mise à jour du stock
      await prisma.stock.update({
        where: { productId: item.productId },
        data: {
          quantite: { increment: item.quantite },
          quantiteVendu: { decrement: item.quantite },
        },
      });
    }

    return { message: "Commande annulée et stock réajusté" };
  },
};

module.exports = StockMovementController;
