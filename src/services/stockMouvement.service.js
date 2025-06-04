const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const StockMovementService = {
  async create(data) {
    return await prisma.stockMovement.create({ data });
  },

  async getAll() {
    return await prisma.stockMovement.findMany({
      include: { product: true },
      orderBy: { createdAt: "desc" },
    });
  },

  async getById(id) {
    return await prisma.stockMovement.findUnique({
      where: { id: parseInt(id) },
      include: { product: true },
    });
  },

  async getByProduct(productId) {
    return await prisma.stockMovement.findMany({
      where: { productId: parseInt(productId) },
      include: { product: true },
      orderBy: { createdAt: "desc" },
    });
  },

  async update(id, data) {
    return await prisma.stockMovement.update({
      where: { id: parseInt(id) },
      data,
    });
  },

  async delete(id) {
    return await prisma.stockMovement.delete({
      where: { id: parseInt(id) },
    });
  },
};

module.exports = StockMovementService;
