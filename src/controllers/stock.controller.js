const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getStockStatus = async (req, res) => {
  const { threshold = 5 } = req.query;

  const products = await prisma.product.findMany({
    include: {
      stocks: true,
      importDetails: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  const stockStatus = products.map((product) => {
    const totalStock = product.stocks.reduce(
      (sum, stock) => sum + stock.quantite,
      0
    );
    const status =
      totalStock <= 0
        ? "RUPTURE"
        : totalStock <= threshold
        ? "CRITIQUE"
        : "DISPONIBLE";

    return {
      productId: product.id,
      reference: product.referenceCode,
      oem: product.oem,
      marque: product.marque,
      currentStock: totalStock,
      lastPurchasePrice: product.importDetails[0]?.purchasePrice,
      status,
      needsReorder: status === "CRITIQUE" && product.importDetails.length > 0,
    };
  });

  res.json(stockStatus);
};

// stock.controller.ts
const getAllStocks = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;

    const whereClause = {
      product: search
        ? {
            OR: [
              { referenceCode: { contains: search, mode: "insensitive" } },
              { codeArt: { contains: search, mode: "insensitive" } },
              { libelle: { contains: search, mode: "insensitive" } },
              { oem: { contains: search, mode: "insensitive" } },
              { marque: { contains: search, mode: "insensitive" } },
            ],
          }
        : undefined,
    };

    const stocks = await prisma.stock.findMany({
      where: whereClause,
      include: {
        product: {
          select: {
            id: true,
            codeArt: true,
            referenceCode: true,
            libelle: true,
            oem: true,
            marque: true,
            autoFinal: true,
          },
        },
        // entrepot: true,
      },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
      orderBy: {
        product: {
          referenceCode: "asc",
        },
      },
    });

    const total = await prisma.stock.count({ where: whereClause });

    res.json({
      data: stocks,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching stocks:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

const getStockAnalytics = async (req, res) => {
  try {
    const [
      totalProducts,
      outOfStockCount,
      totalQuantity,
      totalValueResult,
      availableStockCount,
    ] = await Promise.all([
      // 1. Nombre total de produits différents en stock
      prisma.stock.count(),

      // 2. Nombre de produits en rupture
      prisma.stock.count({
        where: {
          OR: [{ quantite: { lte: 0 } }, { status: "RUPTURE" }],
        },
      }),

      // 3. Quantité totale de toutes les pièces en stock
      prisma.stock.aggregate({
        _sum: { quantite: true },
      }),

      // 4. Valeur totale du stock (quantité * prix)
      prisma.$queryRaw`
        SELECT SUM(s.quantite * s."prix_final") as totalValue
        FROM "Stock" s
      `,

      // 5. Produits disponibles (en stock)
      prisma.stock.count({
        where: {
          quantite: { gt: 0 },
          status: { not: "RUPTURE" },
        },
      }),
    ]);

    // Calcul de la valeur moyenne par pièce
    const averageValue = totalValueResult[0]?.totalValue
      ? totalValueResult[0].totalValue / totalQuantity._sum.quantite
      : 0;

    res.json({
      totalProducts,
      outOfStock: outOfStockCount,
      availableStock: availableStockCount,
      totalQuantity: totalQuantity._sum.quantite || 0,
      totalValue: totalValueResult[0]?.totalValue || 0,
      averageValue: Number(averageValue.toFixed(2)),
      stockCoverage:
        totalQuantity._sum.quantite > 0
          ? Number(((availableStockCount / totalProducts) * 100).toFixed(1))
          : 0,
    });
  } catch (error) {
    console.error("Erreur analyse stock:", error);
    res.status(500).json({
      error: "Échec du calcul des statistiques",
      details: process.env.NODE_ENV === "development" ? error.message : null,
    });
  }
};

const getAvailableProducts = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: {
        stocks: {
          some: {
            quantite: {
              gt: 0,
            },
            status: "DISPONIBLE",
          },
        },
      },
      include: {
        stocks: true,
      },
    });

    res.status(200).json(products);
  } catch (error) {
    console.error(
      "Erreur lors du chargement des produits disponibles :",
      error
    );
    res
      .status(500)
      .json({ error: "Erreur serveur lors de la récupération des produits." });
  }
};

// const updateStock = async (req, res) => {
//   const { productId, quantity, reason, movementType } = req.body;
//   //   const userId = req.user.id;

//   // Validation du type de mouvement
//   const validTypes = Object.values(MovementType);
//   if (!validTypes.includes(movementType)) {
//     return res.status(400).json({ error: "Type de mouvement invalide" });
//   }

//   await prisma.$transaction([
//     prisma.stockMovement.create({
//       data: {
//         productId,
//         quantity: Math.abs(quantity),
//         type: movementType,
//         reason,
//         // userId
//       },
//     }),
//     prisma.stock.updateMany({
//       where: { productId },
//       data: {
//         quantite: {
//           increment: quantity,
//         },
//       },
//     }),
//   ]);

//   res.json({ success: true });
// };

// zavabaovao

// controllers/stock.controller.ts
const getProductDistribution = async (req, res) => {
  const productId = parseInt(req.params.productId);

  try {
    // 1. Récupérer le produit et ses informations de stock
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        stocks: {
          include: {
            entrepots: {
              include: {
                entrepot: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      return res.status(404).json({ error: "Produit non trouvé" });
    }

    // 2. Vérifier s'il y a des stocks pour ce produit
    if (product.stocks.length === 0) {
      return res.json({
        productId,
        codeArt: product.codeArt,
        reference: product.referenceCode,
        libelle: product.libelle,
        total: 0,
        assigned: [],
        unassigned: 0,
        message: "Aucun stock disponible pour ce produit",
      });
    }

    // 3. Calculer les distributions
    const stock = product.stocks[0]; // Un seul stock par produit dans le nouveau modèle

    // Quantité totale (dans entrepôts + qttsansEntrepot)
    const total = stock.quantite;

    // Quantité dans les entrepôts
    const assigned = stock.entrepots.map((e) => ({
      entrepotId: e.entrepotId,
      entrepotName: e.entrepot.libelle,
      quantity: e.quantite,
      stockEntrepotId: e.id,
    }));

    // Quantité non assignée (qttsansEntrepot)
    const unassigned = stock.qttsansEntrepot;

    // Vérification cohérence des totaux
    const totalAssigned = assigned.reduce((sum, a) => sum + a.quantity, 0);
    const calculatedTotal = totalAssigned + unassigned;

    res.json({
      productId,
      codeArt: product.codeArt,
      reference: product.referenceCode,
      libelle: product.libelle,
      total,
      totalAssigned,
      unassigned,
      assigned,
      coherencyCheck: {
        calculatedTotal,
        matches: calculatedTotal === total,
        difference: calculatedTotal - total,
      },
      stockId: stock.id,
    });
  } catch (error) {
    console.error("Erreur:", error);
    res.status(500).json({ error: "Erreur serveur", details: error.message });
  }
};

const updateStockDistribution = async (req, res) => {
  const { productId, distributions } = req.body;
  console.log(req.body);

  try {
    // 1. Récupérer le stock du produit
    const stock = await prisma.stock.findFirst({
      where: { productId },
      include: { entrepots: true },
    });

    if (!stock) {
      return res
        .status(404)
        .json({ error: "Stock non trouvé pour ce produit" });
    }

    // 2. Séparer la quantité sans entrepot et les distributions d'entrepôts
    const newQttSansEntrepot =
      distributions.find((d) => d.entrepotId === null)?.quantity || 0;
    const entrepotDistributions = distributions.filter(
      (d) => d.entrepotId !== null
    );

    // 3. Convertir les entrepotId en nombres
    const entrepotIds = entrepotDistributions.map((d) =>
      parseInt(d.entrepotId)
    );

    // 4. Vérifier la cohérence des quantités
    const totalDistributed = entrepotDistributions.reduce(
      (sum, d) => sum + d.quantity,
      0
    );
    const newTotal = newQttSansEntrepot + totalDistributed;

    if (newTotal > stock.quantite) {
      return res.status(400).json({
        error: `La somme des quantités (${newTotal}) dépasse le stock total (${stock.quantite})`,
      });
    }

    // 5. Mettre à jour en transaction
    await prisma.$transaction(async (prisma) => {
      // Supprimer seulement les entrepôts qui ne sont pas dans la nouvelle distribution
      if (entrepotIds.length > 0) {
        await prisma.stockEntrepot.deleteMany({
          where: {
            stockId: stock.id,
            entrepotId: { notIn: entrepotIds },
          },
        });
      } else {
        // Si aucun entrepot dans la nouvelle distribution, tout supprimer
        await prisma.stockEntrepot.deleteMany({
          where: { stockId: stock.id },
        });
      }

      // Mettre à jour ou créer les nouvelles distributions
      for (const dist of entrepotDistributions) {
        await prisma.stockEntrepot.upsert({
          where: {
            stockId_entrepotId: {
              stockId: stock.id,
              entrepotId: parseInt(dist.entrepotId),
            },
          },
          update: { quantite: dist.quantity },
          create: {
            stockId: stock.id,
            entrepotId: parseInt(dist.entrepotId),
            quantite: dist.quantity,
          },
        });
      }

      // Mettre à jour la quantité sans entrepot
      await prisma.stock.update({
        where: { id: stock.id },
        data: {
          qttsansEntrepot: newQttSansEntrepot,
        },
      });
    });

    // 6. Retourner les données mises à jour
    const updatedData = await prisma.stock.findUnique({
      where: { id: stock.id },
      include: {
        entrepots: {
          include: { entrepot: true },
        },
        product: {
          select: {
            referenceCode: true,
            libelle: true,
          },
        },
      },
    });

    res.json({
      success: true,
      productId,
      stockId: stock.id,
      total: stock.quantite,
      qttsansEntrepot: updatedData.qttsansEntrepot,
      distributions: updatedData.entrepots.map((e) => ({
        entrepotId: e.entrepotId,
        entrepotName: e.entrepot.libelle,
        quantity: e.quantite,
      })),
    });
  } catch (error) {
    console.error("Erreur:", error);
    res.status(500).json({
      error: "Erreur serveur",
      details: error.message,
    });
  }
};

module.exports = {
  getStockStatus, //liste stock pour le manager pour l'instant
  getStockAnalytics,
  getAllStocks,
  getAvailableProducts,
  getProductDistribution,
  updateStockDistribution,
};
