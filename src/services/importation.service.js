const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function enregistrerImportation(importData, importParts) {
  try {
    return await prisma.$transaction(async (prisma) => {
      // 1. Création de l'enregistrement d'importation principal
      const importRecord = await prisma.import.create({
        data: {
          reference: `IMP-${Date.now().toString(36).toUpperCase()}`,
          description:
            importData.description ||
            `Import ${new Date().toLocaleDateString()}`,
          marge: importData.marge,
          fretAvecDD: importData.fretAvecDD || 0,
          fretSansDD: importData.fretSansDD || 0,
          douane: importData.douane || 0,
          tva: importData.tva || 0,
          tauxDeChange: importData.tauxDeChange || 1,
          fileName: importData.fileName || "import.csv",
          status: "COMPLETED",
          importedAt: new Date(),
        },
      });

      // 2. Traitement de chaque article importé
      for (const part of importParts) {
        if (!part.CODE_ART) continue;

        // a. Trouver ou créer le produit
        let product = await prisma.product.findUnique({
          where: { codeArt: "" + part.CODE_ART },
        });

        if (!product && part.oem && part.marque) {
          product = await prisma.product.findFirst({
            where: {
              // oem: part.oem, taloha ilay vaovao a tester
              OR: [
                { oem: part.oem.trim() },
                { oem: part.oem.trim().replace(/\s/g, "") }, // Version sans espaces
              ],
              marque: part.marque,
              codeArt: { not: { startsWith: "GEN-" } },
            },
          });
        }

        if (!product) {
          product = await prisma.product.create({
            data: {
              codeArt: "" + part.CODE_ART,
              referenceCode: `PROD-${part.oem || "GEN"}-${Math.random()
                .toString(36)
                .slice(2, 6)
                .toUpperCase()}`,
              oem: part.oem || "",
              marque: part.marque || "",
              autoFinal: part.auto_final || "",
              libelle: part.LIB1 || "",
            },
          });
        }

        // b. Récupérer le dernier prix du stock existant
        const currentStock = await prisma.stock.findUnique({
          where: { productId: product.id },
        });

        const nouveauPrix = parseFloat(part.prix_de_vente) || 0;
        const ancienPrix = currentStock?.prixFinal
          ? parseFloat(currentStock.prixFinal.toString())
          : 0;
        const prixFinal = Math.max(nouveauPrix, ancienPrix);

        // c. Historique des prix si changement
        if (currentStock && nouveauPrix !== ancienPrix) {
          await prisma.priceHistory.create({
            data: {
              productId: product.id,
              oldPrice: ancienPrix,
              newPrice: nouveauPrix,
              //   changedBy,
              changeReason: `Import ${importRecord.reference}`,
              changeType: nouveauPrix > ancienPrix ? "INCREASE" : "DECREASE",
            },
          });
        }

        // d. Création de la partie importée
        await prisma.importedPart.create({
          data: {
            importId: importRecord.id,
            productId: product.id,
            codeArt: "" + part.CODE_ART,
            marque: part.marque || "",
            oem: part.oem || "",
            autoFinal: part.auto_final || "",
            lib1: part.LIB1 || "",
            quantity: parseInt(part.Qte) || 0,
            qttArrive: parseInt(part.qte_arv) || parseInt(part.Qte) || 0,
            poids: parseFloat(part.POIDS_NET) || 0,
            purchasePrice: parseFloat(part.PRIX_UNIT) || 0,
            salePrice: nouveauPrix,
            margin: parseFloat(importData.marge) || 0,
          },
        });

        // e. Mise à jour du stock (toujours avec le prix le plus élevé)
        await prisma.stock.upsert({
          where: { productId: product.id },
          update: {
            quantite: {
              increment: parseInt(part.qte_arv) || parseInt(part.Qte) || 0,
            },
            prixFinal: prixFinal,
            status:
              (parseInt(part.qte_arv) || parseInt(part.Qte) || 0) > 0
                ? "DISPONIBLE"
                : "RUPTURE",
            lib1: part.LIB1 || undefined,
          },
          create: {
            productId: product.id,
            // codeArt: part.CODE_ART,
            lib1: part.LIB1 || "",
            quantite: parseInt(part.qte_arv) || parseInt(part.Qte) || 0,
            quantiteVendu: 0,
            prixFinal: prixFinal,
            status: "DISPONIBLE",
            entrepotId: null,
          },
        });
      }

      return {
        success: true,
        importId: importRecord.id,
        message: "Importation enregistrée avec succès",
      };
    });
  } catch (error) {
    console.error("Erreur lors de l'enregistrement:", error);
    return {
      success: false,
      message: "Échec de l'enregistrement",
      error: error.message,
    };
  }
}
module.exports = {
  enregistrerImportation,
};
