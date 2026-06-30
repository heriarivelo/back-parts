// pieces.controller.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getPieces = async (req, res) => {
  try {
    const pieces = await prisma.product.findMany({
      include: {
        stocks: true,
      },
    });
    res.json(pieces);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const searchPieces = async (req, res) => {
  try {
    const { q } = req.query;
    const pieces = await prisma.product.findMany({
      where: {
        OR: [
          { marque: { contains: q, mode: "insensitive" } },
          { oem: { contains: q, mode: "insensitive" } },
          { libelle: { contains: q, mode: "insensitive" } },
          { autoFinal: { contains: q, mode: "insensitive" } },
        ],
      },
      include: {
        stocks: true,
      },
    });
    res.json(pieces);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getStockDetail = async (req, res) => {
  try {
    const stockId = parseInt(req.params.stockId, 10);

    if (!stockId) {
      return res.status(400).json({ error: "L'ID du stock est requis" });
    }

    const stock = await prisma.stock.findUnique({
      where: { id: stockId },
      include: {
        product: {
          select: {
            id: true,
            codeArt: true,
            referenceCode: true,
            oem: true,
            marque: true,
            libelle: true,
            category: true,
            autoFinal: true,
          },
        },
        entrepots: {
          where: {
            quantite: { gt: 0 },
          },
          select: {
            id: true,
            quantite: true,
            entrepot: {
              select: {
                id: true,
                libelle: true,
                adresse: true,
              },
            },
          },
        },
      },
    });

    if (!stock) {
      return res.status(404).json({ error: "Stock introuvable" });
    }

    const locations = stock.entrepots.map((item) => ({
      stockEntrepotId: item.id,
      entrepotId: item.entrepot.id,
      entrepotName: item.entrepot.libelle,
      entrepotAdresse: item.entrepot.adresse,
      quantity: item.quantite,
    }));

    return res.status(200).json({
      stockId: stock.id,
      productId: stock.productId,

      codeArt: stock.product?.codeArt,
      referenceCode: stock.product?.referenceCode,
      libelle: stock.lib1 || stock.product?.libelle,

      oem: stock.product?.oem,
      marque: stock.product?.marque,
      category: stock.product?.category,
      autoFinal: stock.product?.autoFinal,

      quantite: stock.quantite,
      qttsansEntrepot: stock.qttsansEntrepot,
      quantiteVendu: stock.quantiteVendu,
      quantiteReserve: stock.quantiteReserve,
      prixFinal: stock.prixFinal,
      status: stock.status,

      locations,
      totalLocatedQuantity: locations.reduce(
        (sum, item) => sum + Number(item.quantity || 0),
        0
      ),

      createdAt: stock.createdAt,
      updatedAt: stock.updatedAt,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

module.exports = { getPieces, searchPieces, getStockDetail };
