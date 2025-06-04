const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getAllFacturesWithDetails = async () => {
  return await prisma.facture.findMany({
    include: {
      commandeVente: {
        include: {
          customer: true,
          pieces: {
            include: {
              product: true,
            },
          },
        },
      },
      remises: true,
      paiements: true,
      createdBy: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

module.exports = {
  getAllFacturesWithDetails,
};
