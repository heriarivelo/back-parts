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
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const pageSize = Math.max(parseInt(req.query.pageSize || "9", 10), 1);
    const search = (req.query.search || "").trim();

    const where = search
      ? {
          libelle: {
            contains: search,
            mode: "insensitive",
          },
        }
      : {};

    const [totalItems, entrepots] = await Promise.all([
      prisma.entrepot.count({ where }),
      prisma.entrepot.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: {
          libelle: "asc",
        },
        include: {
          stockEntrepots: {
            where: {
              quantite: { gt: 0 },
            },
            select: {
              quantite: true,
            },
          },
        },
      }),
    ]);

    const items = entrepots.map((entrepot) => ({
      id: entrepot.id,
      libelle: entrepot.libelle,
      description: entrepot.description,
      adresse: entrepot.adresse,
      stockCount: entrepot.stockEntrepots.length,
      totalQuantity: entrepot.stockEntrepots.reduce(
        (sum, stock) => sum + Number(stock.quantite || 0),
        0
      ),
      createdAt: entrepot.createdAt,
      updatedAt: entrepot.updatedAt,
    }));

    return res.status(200).json({
      items,
      totalItems,
      page,
      pageSize,
      totalPages: Math.ceil(totalItems / pageSize),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Supprimer un entrepôt
exports.deleteEntrepot = async (req, res) => {
  try {
    const { id } = req.params;
    const entrepotId = parseInt(id);

    await prisma.$transaction(async (prisma) => {
      // 1. Récupérer tous les StockEntrepot associés à cet entrepôt
      const stockEntrepots = await prisma.stockEntrepot.findMany({
        where: { entrepotId },
        include: { stock: true },
      });

      // 2. Pour chaque association, réintégrer la quantité dans qttsansEntrepot
      for (const se of stockEntrepots) {
        await prisma.stock.update({
          where: { id: se.stockId },
          data: {
            qttsansEntrepot: {
              increment: se.quantite,
            },
          },
        });
      }

      // 3. Supprimer toutes les entrées StockEntrepot pour cet entrepôt
      await prisma.stockEntrepot.deleteMany({
        where: { entrepotId },
      });

      // 4. Supprimer l'entrepôt lui-même
      await prisma.entrepot.delete({
        where: { id: entrepotId },
      });
    });

    res.status(200).json({ message: "Entrepôt supprimé avec succès" });
  } catch (error) {
    console.error("Erreur lors de la suppression de l'entrepôt:", error);
    res.status(500).json({
      error: "Erreur serveur",
      details: error.message,
    });
  }
};

// Obtenir les stocks d'un entrepôt
exports.getStocksEntreposes = async (req, res) => {
  try {
    const entrepotId = parseInt(req.query.entrepotId, 10);
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const pageSize = Math.max(parseInt(req.query.pageSize || "10", 10), 1);
    const search = (req.query.search || "").trim();

    if (!entrepotId) {
      return res.status(400).json({ error: "L'ID de l'entrepôt est requis" });
    }

    const baseWhere = {
      entrepotId,
      quantite: { gt: 0 },
    };

    const searchWhere = search
      ? {
          OR: [
            {
              stock: {
                lib1: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            },
            {
              stock: {
                product: {
                  codeArt: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
            },
            {
              stock: {
                product: {
                  referenceCode: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
            },
            {
              stock: {
                product: {
                  oem: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
            },
            {
              stock: {
                product: {
                  marque: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
            },
          ],
        }
      : {};

    const where = {
      AND: [baseWhere, searchWhere],
    };

    const [totalItems, stocks] = await Promise.all([
      prisma.stockEntrepot.count({ where }),
      prisma.stockEntrepot.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          stock: {
            include: {
              product: {
                select: {
                  id: true,
                  codeArt: true,
                  oem: true,
                  marque: true,
                  referenceCode: true,
                },
              },
            },
          },
          entrepot: {
            select: {
              libelle: true,
            },
          },
        },
        orderBy: {
          stock: {
            product: {
              referenceCode: "asc",
            },
          },
        },
      }),
    ]);

    const items = stocks.map((item) => ({
      id: item.stock.id,
      stockEntrepotId: item.id,
      quantite: item.quantite,
      codeArt: item.stock.product?.codeArt || null,
      oem: item.stock.product?.oem || null,
      marque: item.stock.product?.marque || null,
      referenceCode: item.stock.product?.referenceCode || null,
      lib1: item.stock.lib1,
      prixFinal: item.stock.prixFinal,
      entrepot: item.entrepot.libelle,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    res.status(200).json({
      items,
      totalItems,
      page,
      pageSize,
      totalPages: Math.ceil(totalItems / pageSize),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateEntrepotStock = async (req, res) => {
  try {
    const { stockId, entrepotId } = req.body;

    const parsedStockId = parseInt(stockId, 10);
    const parsedEntrepotId = parseInt(entrepotId, 10);

    if (isNaN(parsedStockId) || isNaN(parsedEntrepotId)) {
      return res.status(400).json({ error: "Identifiants invalides." });
    }

    // 🔎 Étape 1 : récupérer la quantité sans entrepôt
    const stock = await prisma.stock.findUnique({
      where: { id: parsedStockId },
      select: { qttsansEntrepot: true },
    });

    if (!stock || stock.qttsansEntrepot <= 0) {
      return res.status(400).json({ error: "Aucune quantité à répartir." });
    }

    const transferQty = stock.qttsansEntrepot;

    // 🔁 Étape 2 : ajouter ou mettre à jour l’entrée dans StockEntrepot
    await prisma.stockEntrepot.upsert({
      where: {
        stockId_entrepotId: {
          stockId: parsedStockId,
          entrepotId: parsedEntrepotId,
        },
      },
      update: {
        quantite: { increment: transferQty },
        updatedAt: new Date(),
      },
      create: {
        stockId: parsedStockId,
        entrepotId: parsedEntrepotId,
        quantite: transferQty,
      },
    });

    // ✅ Étape 3 : remettre qttsansEntrepot à zéro
    await prisma.stock.update({
      where: { id: parsedStockId },
      data: {
        qttsansEntrepot: 0,
      },
    });

    res.status(200).json({ message: "Stock déplacé avec succès" });
  } catch (error) {
    console.error("Erreur de mise à jour du stock :", error);
    res.status(500).json({ error: "Erreur interne du serveur." });
  }
};

exports.updateStockEntrepot = async (req, res) => {
  const { stockId } = req.params;
  const { entrepotId, quantity } = req.body;

  try {
    // 1. Vérifier que le stock existe
    const existingStock = await prisma.stock.findUnique({
      where: { id: Number(stockId) },
    });

    if (!existingStock) {
      return res.status(404).json({ error: "Stock non trouvé" });
    }

    // 2. Vérifier que la quantité est valide
    if (quantity <= 0 || quantity > existingStock.quantite) {
      return res.status(400).json({
        error: "Quantité invalide",
        maxQuantity: existingStock.quantite,
      });
    }

    // 3. Vérifier que l'entrepôt existe
    const entrepotExists = await prisma.entrepot.findUnique({
      where: { id: entrepotId },
    });

    if (!entrepotExists) {
      return res.status(404).json({ error: "Entrepôt non trouvé" });
    }

    // 4. Logique de mise à jour
    let updatedStock;

    await prisma.$transaction(async (tx) => {
      // Cas 1: Le stock existe déjà dans l'entrepôt cible
      const targetStock = await tx.stock.findFirst({
        where: {
          productId: existingStock.productId,
          entrepotId: entrepotId,
        },
      });

      if (targetStock) {
        // Mettre à jour le stock existant
        updatedStock = await tx.stock.update({
          where: { id: targetStock.id },
          data: {
            quantite: targetStock.quantite + quantity,
            status: "DISPONIBLE",
          },
        });
      } else {
        // Cas 2: Créer un nouveau stock dans l'entrepôt cible
        updatedStock = await tx.stock.create({
          data: {
            productId: existingStock.productId,
            entrepotId: entrepotId,
            quantite: quantity,
            lib1: existingStock.lib1,
            prixFinal: existingStock.prixFinal,
            status: "DISPONIBLE",
          },
        });
      }

      // 5. Mettre à jour le stock source
      await tx.stock.update({
        where: { id: existingStock.id },
        data: {
          quantite: existingStock.quantite - quantity,
          status:
            existingStock.quantite - quantity <= 0 ? "RUPTURE" : "DISPONIBLE",
        },
      });

      // 6. Enregistrer le mouvement de stock
      await tx.stockMovement.create({
        data: {
          productId: existingStock.productId,
          type: "TRANSFER",
          quantity: quantity,
          source: `Transfert depuis stock ${existingStock.id} vers entrepôt ${entrepotId}`,
          reason: "Transfert manuel",
        },
      });
    });

    res.json(updatedStock);
  } catch (error) {
    console.error("Erreur transfert stock:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

exports.transferStock = async (req, res) => {
  const { stockId, fromEntrepotId, toEntrepotId, quantity } = req.body;

  try {
    // Validation des données
    if (
      !stockId ||
      !fromEntrepotId ||
      !toEntrepotId ||
      !quantity ||
      quantity <= 0
    ) {
      return res.status(400).json({ error: "Paramètres invalides" });
    }

    const transferResult = await prisma.$transaction(async (tx) => {
      // 1. Vérifier la disponibilité dans l'entrepôt source
      const sourceStock = await tx.stockEntrepot.findUnique({
        where: {
          stockId_entrepotId: {
            stockId: stockId,
            entrepotId: parseInt(fromEntrepotId),
          },
        },
      });

      if (!sourceStock || sourceStock.quantite < quantity) {
        throw new Error("Stock insuffisant dans l'entrepôt source");
      }

      // 2. Retirer du stock source
      await tx.stockEntrepot.update({
        where: {
          stockId_entrepotId: {
            stockId: stockId,
            entrepotId: parseInt(fromEntrepotId),
          },
        },
        data: { quantite: { decrement: quantity } },
      });

      // 3. Ajouter au stock destination
      await tx.stockEntrepot.upsert({
        where: {
          stockId_entrepotId: {
            stockId: stockId,
            entrepotId: parseInt(toEntrepotId),
          },
        },
        update: { quantite: { increment: quantity } },
        create: {
          stockId: stockId,
          entrepotId: parseInt(toEntrepotId),
          quantite: quantity,
        },
      });

      // 4. Enregistrer le mouvement
      // await tx.stockMovement.create({
      //   data: {
      //     stockId,
      //     fromEntrepotId,
      //     toEntrepotId,
      //     type: "TRANSFER",
      //     quantity:quantity,
      //     raeson: `TRF-${Date.now().toString(36).toUpperCase()}`,
      //   },
      // });

      return { success: true, message: "Transfert effectué avec succès" };
    });

    res.status(200).json({
      success: true,
      message: "Transfert effectué avec succès",
      data: transferResult,
    });
  } catch (error) {
    console.error("Erreur lors du transfert:", error);
    res.status(500).json({
      error: "Erreur lors du transfert",
      details: error.message,
    });
  }
};

// router.get('/api/entrepots/stock/:productId', produitIdEntrepots) => {
exports.produitIdEntrepots = async (req, res) => {
  try {
    const productId = parseInt(req.params.productId);

    if (isNaN(productId)) {
      return res.status(400).json({ error: "ID produit invalide" });
    }

    const entrepots = await prisma.entrepot.findMany({
      where: {
        stockEntrepots: {
          some: {
            stock: {
              productId: productId,
              quantite: { gt: 0 }, // Seulement les entrepôts avec stock disponible
            },
          },
        },
      },
      include: {
        stockEntrepots: {
          where: {
            stock: {
              productId: productId,
            },
          },
          include: {
            stock: true,
          },
        },
      },
    });

    // Transformation sécurisée des données
    const result = entrepots.map((entrepot) => {
      const stock = entrepot.stockEntrepots[0]?.stock;
      return {
        id: entrepot.id,
        libelle: entrepot.libelle,
        quantite: stock ? entrepot.stockEntrepots[0].quantite : 0,
        productId: stock?.productId || productId,
      };
    });

    // Console.log utile pour le débogage
    console.log("Entrepôts disponibles:", JSON.stringify(result, null, 2));

    res.json(result);
  } catch (error) {
    console.error("Erreur dans produitIdEntrepots:", error);
    res.status(500).json({
      error: "Erreur serveur",
      details: error.message,
    });
  }
};
