const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Créer un entrepôt
exports.createEntrepot = async (req, res) => {
  try {
    const { libelle } = req.body;
    const entrepot = await prisma.entrepot.create({
      data: { libelle },
    });
    res.status(201).json(entrepot);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Lister tous les entrepôts
exports.getAllEntrepots = async (req, res) => {
  try {
    const entrepots = await prisma.entrepot.findMany();
    res.status(200).json(entrepots);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Obtenir un entrepôt par ID
// exports.getEntrepotById = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const entrepot = await prisma.entrepot.findUnique({
//       where: { id: parseInt(id) },
//     });
//     if (!entrepot)
//       return res.status(404).json({ message: "Entrepôt non trouvé" });
//     res.status(200).json(entrepot);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

// Supprimer un entrepôt
exports.deleteEntrepot = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.$transaction([
      // Réinitialiser les stocks associés
      prisma.stock.updateMany({
        where: { entrepotId: parseInt(id) },
        data: { entrepotId: null },
      }),
      // Supprimer l'entrepôt
      prisma.entrepot.delete({
        where: { id: parseInt(id) },
      }),
    ]);

    res.status(200).json({ message: "Entrepôt supprimé avec succès" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Obtenir les stocks d'un entrepôt
exports.getStocksEntreposes = async (req, res) => {
  try {
    const { entrepotId } = req.query;
    const stocks = await prisma.stock.findMany({
      where: {
        entrepotId: entrepotId ? parseInt(entrepotId) : null,
      },
    });
    res.status(200).json(stocks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Rechercher par code article
// exports.findByCode_article = async (req, res) => {
//   try {
//     const { code_art } = req.query;
//     const stocks = await prisma.stock.findMany({
//       where: {
//         code_art: {
//           contains: code_art || "",
//           mode: "insensitive",
//         },
//       },
//     });
//     res.status(200).json(stocks);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

exports.findByCode_article = async (req, res) => {
  try {
    const { oem, marque, referenceCode } = req.query;

    const whereClause = {
      product: {
        AND: [
          oem ? { oem: { contains: oem, mode: "insensitive" } } : {},
          marque ? { marque: { contains: marque, mode: "insensitive" } } : {},
          referenceCode
            ? {
                referenceCode: { contains: referenceCode, mode: "insensitive" },
              }
            : {},
        ],
      },
    };

    const stocks = await prisma.stock.findMany({
      where: whereClause,
      include: {
        product: {
          select: {
            oem: true,
            marque: true,
            referenceCode: true,
          },
        },
      },
    });

    res.status(200).json(stocks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Mettre à jour l'entrepôt d'un stock
// exports.updateEntrepotStock = async (req, res) => {
//   try {
//     const { stockId, entrepotId } = req.body;

//     const stock = await prisma.stock.update({
//       where: { id: parseInt(stockId) },
//       data: {
//         entrepotId: entrepotId ? parseInt(entrepotId) : null,
//       },
//     });

//     res.status(200).json({ message: "Entrepôt mis à jour avec succès", stock });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

exports.updateEntrepotStock = async (req, res) => {
  try {
    const { stockId, entrepotId } = req.body;

    // Validation des entrées
    const parsedStockId = parseInt(stockId, 10);
    if (isNaN(parsedStockId)) {
      return res.status(400).json({ error: "Identifiant de stock invalide." });
    }

    const parsedEntrepotId =
      entrepotId !== null ? parseInt(entrepotId, 10) : null;
    if (entrepotId !== null && isNaN(parsedEntrepotId)) {
      return res
        .status(400)
        .json({ error: "Identifiant d'entrepôt invalide." });
    }

    // Mise à jour du stock
    const stock = await prisma.stock.update({
      where: { id: parsedStockId },
      data: {
        entrepotId: parsedEntrepotId,
      },
    });

    res.status(200).json({ message: "Entrepôt mis à jour avec succès", stock });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du stock :", error);
    res.status(500).json({ error: "Erreur interne du serveur." });
  }
};

// Mettre à jour plusieurs stocks
// exports.updateEntrepotStockListe = async (req, res) => {
//   try {
//     const { stocks } = req.body;
//     const notFoundProducts = [];

//     for (const item of stocks) {
//       // Trouver le produit par ses identifiants stables
//       const product = await prisma.product.findFirst({
//         where: {
//           oem: item.oem,
//           marque: item.marque,
//           referenceCode: item.referenceCode,
//         },
//       });

//       if (!product) {
//         notFoundProducts.push(item);
//         continue;
//       }

//       // Mise à jour via l'ID produit
//       await prisma.stock.updateMany({
//         where: {
//           productId: product.id,
//           lib1: item.lib1,
//           prixFinal: item.prix_final,
//         },
//         data: {
//           entrepotId: item.entrepotId ? parseInt(item.entrepotId) : null,
//         },
//       });
//     }

//     res.status(200).json({
//       message: "Mise à jour terminée",
//       notFoundProducts,
//     });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

exports.getArticleNoEntrepots = async (req, res) => {
  try {
    const stocks = await prisma.stock.findMany({
      where: {
        entrepotId: null,
        quantite: { gt: 0 },
      },
      include: {
        product: {
          select: {
            oem: true,
            marque: true,
            referenceCode: true,
          },
        },
      },
    });

    const result = stocks.map((stock) => ({
      id: stock.id,
      oem: stock.product.oem,
      marque: stock.product.marque,
      referenceCode: stock.product.referenceCode,
      lib1: stock.lib1,
      quantite: stock.quantite,
      prixFinal: stock.prixFinal,
    }));

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// exports.getArticleEntrepots = async (req, res) => {
//   try {
//     const stocks = await prisma.stock.findMany({
//       where: {
//         quantite: { gt: 0 },
//       },
//       include: {
//         product: {
//           select: {
//             oem: true,
//             marque: true,
//             referenceCode: true,
//           },
//         },
//         entrepot: true,
//       },
//     });

//     const result = stocks.map((stock) => ({
//       oem: stock.product.oem,
//       marque: stock.product.marque,
//       referenceCode: stock.product.referenceCode,
//       lib1: stock.lib1,
//       prixFinal: stock.prixFinal,
//       entrepot: stock.entrepot?.libelle || "Non assigné",
//     }));

//     res.status(200).json(result);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };
