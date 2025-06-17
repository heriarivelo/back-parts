const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getStockByImport = async (productId) => {
  const stockDetails = await prisma.importedPart.findMany({
    where: {
      productId: productId,
      qttArrive: { gt: 0 },
    },
    select: {
      id: true,
      importId: true,
      qttArrive: true,
      salePrice: true,
      import: {
        select: {
          reference: true,
          importedAt: true,
        },
      },
    },
    orderBy: {
      import: { importedAt: "asc" },
    },
  });

  return stockDetails.map((item) => ({
    productId: productId,
    importId: item.importId,
    importReference: item.import.reference,
    remainingQuantity: item.qttArrive,
    unitPrice: item.salePrice,
    importDate: item.import.importedAt,
  }));
};

module.exports = {
  getStockByImport,
};
