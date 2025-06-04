// product.controller.t
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const getPriceHistory = async (req, res) => {
  try {
    const { productId } = req.params;
    console.log(productId);

    const history = await prisma.priceHistory.findMany({
      where: {
        productId: parseInt(productId),
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        product: {
          select: {
            referenceCode: true,
            libelle: true,
          },
        },
      },
    });

    // Ajouter les prix actuels des imports non vendus
    const currentImports = await prisma.importedPart.findMany({
      where: {
        productId: parseInt(productId),
        qttArrive: { gt: 0 },
      },
      include: {
        import: true,
      },
      orderBy: {
        import: {
          importedAt: "desc",
        },
      },
    });

    const priceHistory = [
      ...history,
      ...currentImports.map((imp) => ({
        id: `import-${imp.id}`,
        oldPrice: imp.salePrice,
        newPrice: imp.salePrice,
        changeReason: `Import ${imp.import.reference}`,
        changeType: "INITIAL",
        createdAt: imp.import.importedAt,
        product: {
          referenceCode: imp.import.reference,
          libelle: `Lot importé (${imp.import.reference})`,
        },
      })),
    ].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    res.json(priceHistory);
  } catch (error) {
    console.error("Error fetching price history:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// Mettre à jour le prix d'un produit
// router.patch('/:productId', async (req, res) => {
const updatePrixPiece = async (req, res) => {
  const { productId } = req.params;
  const { newPrice, reason } = req.body;

  try {
    // Commencer une transaction
    const result = await prisma.$transaction(async (prisma) => {
      // 1. Récupérer l'ancien prix
      const product = await prisma.product.findUnique({
        where: { id: parseInt(productId) },
        include: { stocks: true },
      });

      if (!product) {
        throw new Error("Produit non trouvé");
      }

      const oldPrice = product.stocks[0]?.prixFinal || 0;

      // 2. Déterminer le type de changement
      let changeType;
      if (oldPrice === 0) {
        changeType = "INITIAL";
      } else if (newPrice > oldPrice) {
        changeType = "INCREASE";
      } else {
        changeType = "DECREASE";
      }

      // 3. Mettre à jour le stock avec le nouveau prix
      await prisma.stock.updateMany({
        where: { productId: parseInt(productId) },
        data: { prixFinal: newPrice },
      });

      // 4. Créer une entrée dans l'historique des prix
      await prisma.priceHistory.create({
        data: {
          productId: parseInt(productId),
          oldPrice: oldPrice,
          newPrice: newPrice,
          changeReason: reason,
          changeType: changeType,
        },
      });

      return { success: true };
    });

    res.json(result);
  } catch (error) {
    console.error("Error updating price:", error);
    res.status(500).json({ error: "Erreur lors de la mise à jour du prix" });
  }
};

module.exports = {
  getPriceHistory,
  updatePrixPiece,
  //   updatePaymentStatus,
};
