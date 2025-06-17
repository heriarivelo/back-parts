const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function clearDatabaseExceptUsers() {
  await prisma.$transaction([
    // D'abord les tables qui ont des dépendances vers d'autres
    prisma.reapproItem.deleteMany(),
    prisma.piecesCommande.deleteMany(),
    prisma.stockMovement.deleteMany(),
    prisma.priceHistory.deleteMany(),
    prisma.importedPart.deleteMany(),
    prisma.remise.deleteMany(),
    prisma.paiement.deleteMany(), // Doit être avant facture si facture a une FK vers paiement
    prisma.facture.deleteMany(),

    // Ensuite les tables de base
    prisma.stockEntrepot.deleteMany(),
    prisma.stock.deleteMany(),
    prisma.commandeVente.deleteMany(),
    prisma.reapprovisionnement.deleteMany(),
    prisma.import.deleteMany(),
    prisma.product.deleteMany(),
    prisma.entrepot.deleteMany(),
    prisma.supplier.deleteMany(),
    prisma.customer.deleteMany(),
  ]);
}

module.exports = { clearDatabaseExceptUsers };
