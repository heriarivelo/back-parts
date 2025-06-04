const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// const { PrismaClient } = require('@prisma/client');
// const prisma = new PrismaClient();

const getStocks = async (req, res) => {
  try {
    const stocks = await prisma.stock.findMany({
      include: {
        product: true,
      },
    });
    res.json(stocks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getStockAnalytics = async (req, res) => {
  try {
    const [totalItems, outOfStock, totalValue] = await Promise.all([
      prisma.stock.count(),
      prisma.stock.count({ where: { status: "RUPTURE" } }),
      prisma.stock.aggregate({
        _sum: {
          quantite: true,
          prixFinal: true,
        },
      }),
    ]);

    res.json({
      totalItems,
      outOfStock,
      totalValue: totalValue._sum.prixFinal || 0,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getStocks,
  getStockAnalytics,
};
