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

module.exports = { getPieces, searchPieces };
