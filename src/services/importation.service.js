const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function enregistrerImportation(importData, importParts) {
  try {
    // return await prisma.$transaction(async (prisma) => {
    //   // 1. Création de l'enregistrement d'importation principal
    //   const importRecord = await prisma.import.create({
    //     data: {
    //       reference: `IMP-${Date.now().toString(36).toUpperCase()}`,
    //       description:
    //         importData.description ||
    //         `Import ${new Date().toLocaleDateString()}`,
    //       marge: importData.marge,
    //       fretAvecDD: importData.fretAvecDD || 0,
    //       fretSansDD: importData.fretSansDD || 0,
    //       douane: importData.douane || 0,
    //       tva: importData.tva || 0,
    //       tauxDeChange: importData.tauxDeChange || 1,
    //       fileName: importData.fileName || "import.csv",
    //       status: "COMPLETED",
    //       importedAt: new Date(),
    //     },
    //   });

    //   // 2. Traitement de chaque article importé
    //   for (const part of importParts) {
    //     if (!part.CODE_ART) continue;

    //     // a. Trouver ou créer le produit
    //     let product = await prisma.product.findUnique({
    //       where: { codeArt: "" + part.CODE_ART },
    //     });

    //     if (!product && part.oem && part.marque) {
    //       product = await prisma.product.findFirst({
    //         where: {
    //           // oem: part.oem, taloha ilay vaovao a tester
    //           OR: [
    //             { oem: part.oem.trim() },
    //             { oem: part.oem.trim().replace(/\s/g, "") }, // Version sans espaces
    //           ],
    //           marque: part.marque,
    //           codeArt: { not: { startsWith: "GEN-" } },
    //         },
    //       });
    //     }

    //     if (!product) {
    //       product = await prisma.product.create({
    //         data: {
    //           codeArt: "" + part.CODE_ART,
    //           referenceCode: `PROD-${part.oem || "GEN"}-${Math.random()
    //             .toString(36)
    //             .slice(2, 6)
    //             .toUpperCase()}`,
    //           oem: part.oem || "",
    //           marque: part.marque || "",
    //           autoFinal: part.auto_final || "",
    //           libelle: part.LIB1 || "",
    //         },
    //       });
    //     }

    //     // b. Récupérer le dernier prix du stock existant
    //     const currentStock = await prisma.stock.findUnique({
    //       where: { productId: product.id },
    //     });

    //     const nouveauPrix = parseFloat(part.prix_de_vente) || 0;
    //     const ancienPrix = currentStock?.prixFinal
    //       ? parseFloat(currentStock.prixFinal.toString())
    //       : 0;
    //     const prixFinal = Math.max(nouveauPrix, ancienPrix);

    //     // c. Historique des prix si changement
    //     if (currentStock && nouveauPrix !== ancienPrix) {
    //       await prisma.priceHistory.create({
    //         data: {
    //           productId: product.id,
    //           oldPrice: ancienPrix,
    //           newPrice: nouveauPrix,
    //           //   changedBy,
    //           changeReason: `Import ${importRecord.reference}`,
    //           changeType: nouveauPrix > ancienPrix ? "INCREASE" : "DECREASE",
    //         },
    //       });
    //     }

    //     // d. Création de la partie importée
    //     await prisma.importedPart.create({
    //       data: {
    //         importId: importRecord.id,
    //         productId: product.id,
    //         codeArt: "" + part.CODE_ART,
    //         marque: part.marque || "",
    //         oem: part.oem || "",
    //         autoFinal: part.auto_final || "",
    //         lib1: part.LIB1 || "",
    //         quantity: parseInt(part.Qte) || 0,
    //         qttArrive: parseInt(part.qte_arv) || parseInt(part.Qte) || 0,
    //         poids: parseFloat(part.POIDS_NET) || 0,
    //         purchasePrice: parseFloat(part.PRIX_UNIT) || 0,
    //         salePrice: nouveauPrix,
    //         margin: parseFloat(importData.marge) || 0,
    //       },
    //     });

    //     // e. Mise à jour du stock (toujours avec le prix le plus élevé)
    //     await prisma.stock.upsert({
    //       where: { productId: product.id },
    //       update: {
    //         quantite: {
    //           increment: parseInt(part.qte_arv) || parseInt(part.Qte) || 0,
    //         },
    //         prixFinal: prixFinal,
    //         status:
    //           (parseInt(part.qte_arv) || parseInt(part.Qte) || 0) > 0
    //             ? "DISPONIBLE"
    //             : "RUPTURE",
    //         lib1: part.LIB1 || undefined,
    //       },
    //       create: {
    //         productId: product.id,
    //         // codeArt: part.CODE_ART,
    //         lib1: part.LIB1 || "",
    //         quantite: parseInt(part.qte_arv) || parseInt(part.Qte) || 0,
    //         quantiteVendu: 0,
    //         prixFinal: prixFinal,
    //         status: "DISPONIBLE",
    //         entrepotId: null,
    //       },
    //     });
    //   }

    //   return {
    //     success: true,
    //     importId: importRecord.id,
    //     message: "Importation enregistrée avec succès",
    //   };
    // });
    // ici ilay taloha
    // return await prisma.$transaction(async (tx) => {
    //   const importRecord = await tx.import.create({
    //     data: {
    //       reference: `IMP-${Date.now().toString(36).toUpperCase()}`,
    //       description:
    //         importData.description ||
    //         `Import ${new Date().toLocaleDateString()}`,
    //       marge: importData.marge,
    //       fretAvecDD: importData.fretAvecDD || 0,
    //       fretSansDD: importData.fretSansDD || 0,
    //       douane: importData.douane || 0,
    //       tva: importData.tva || 0,
    //       tauxDeChange: importData.tauxDeChange || 1,
    //       fileName: importData.fileName || "import.csv",
    //       status: "COMPLETED",
    //       importedAt: new Date(),
    //     },
    //   });

    //   for (const part of importParts) {
    //     if (!part.CODE_ART) continue;

    //     let product = await tx.product.findUnique({
    //       where: { codeArt: "" + part.CODE_ART },
    //     });

    //     // if (!product && part.oem && part.marque) {
    //     if (!product && part.CODE_ART && part.marque) {
    //       product = await tx.product.findFirst({
    //         where: {
    //           // OR: [
    //           //   { oem: part.oem.trim() },
    //           //   { oem: part.oem.trim().replace(/\s/g, "") },
    //           // ],
    //           codeArt: part.CODE_ART,
    //           marque: part.marque,
    //         },
    //       });
    //     }

    //     if (!product) {
    //       product = await tx.product.create({
    //         data: {
    //           codeArt: "" + part.CODE_ART,
    //           // referenceCode: `PROD-${part.CODE_ART || "GEN"}-${Math.random()
    //           //   .toString(36)
    //           //   .slice(2, 6)
    //           //   .toUpperCase()}`,
    //           referenceCode: `PROD-${part.CODE_ART}-${part.marque}`,
    //           oem: part.oem || "",
    //           marque: part.marque || "",
    //           autoFinal: part.auto_final || "",
    //           libelle: part.LIB1 || "",
    //         },
    //       });
    //     }

    //     const currentStock = await tx.stock.findUnique({
    //       where: { productId: product.id },
    //     });

    //     const nouveauPrix = parseFloat(part.prix_de_vente) || 0;
    //     const ancienPrix = currentStock?.prixFinal
    //       ? parseFloat(currentStock.prixFinal.toString())
    //       : 0;
    //     const prixFinal = Math.max(nouveauPrix, ancienPrix);

    //     if (currentStock && nouveauPrix !== ancienPrix) {
    //       await tx.priceHistory.create({
    //         data: {
    //           productId: product.id,
    //           oldPrice: ancienPrix,
    //           newPrice: nouveauPrix,
    //           changeReason: `Import ${importRecord.reference}`,
    //           changeType: nouveauPrix > ancienPrix ? "INCREASE" : "DECREASE",
    //         },
    //       });
    //     }

    //     await tx.importedPart.create({
    //       data: {
    //         importId: importRecord.id,
    //         productId: product.id,
    //         codeArt: "" + part.CODE_ART,
    //         marque: part.marque || "",
    //         oem: part.oem || "",
    //         autoFinal: part.auto_final || "",
    //         lib1: part.LIB1 || "",
    //         quantity: parseInt(part.Qte) || 0,
    //         qttArrive: parseInt(part.qte_arv) || parseInt(part.Qte) || 0,
    //         poids: parseFloat(part.POIDS_NET) || 0,
    //         purchasePrice: parseFloat(part.PRIX_UNIT) || 0,
    //         salePrice: nouveauPrix,
    //         margin: parseFloat(importData.marge) || 0,
    //       },
    //     });

    //     await tx.stock.upsert({
    //       where: { productId: product.id },
    //       update: {
    //         quantite: {
    //           increment: parseInt(part.qte_arv) || parseInt(part.Qte) || 0,
    //         },
    //         prixFinal: prixFinal,
    //         status:
    //           (parseInt(part.qte_arv) || parseInt(part.Qte) || 0) > 0
    //             ? "DISPONIBLE"
    //             : "RUPTURE",
    //         lib1: part.LIB1 || undefined,
    //       },
    //       create: {
    //         productId: product.id,
    //         lib1: part.LIB1 || "",
    //         quantite: parseInt(part.qte_arv) || parseInt(part.Qte) || 0,
    //         quantiteVendu: 0,
    //         prixFinal: prixFinal,
    //         status: "DISPONIBLE",
    //         entrepotId: null,
    //       },
    //     });
    //   }

    //   return {
    //     success: true,
    //     importId: importRecord.id,
    //     message: "Importation enregistrée avec succès",
    //   };
    // });
    return await prisma.$transaction(async (tx) => {
      const importRecord = await tx.import.create({
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

      for (const part of importParts) {
        if (!part.CODE_ART) continue;

        // 1. Gestion du Produit (identique)
        let product = await tx.product.findUnique({
          where: { codeArt: "" + part.CODE_ART },
        });

        // if (!product && part.oem && part.marque) {
        if (!product && part.CODE_ART && part.marque) {
          product = await tx.product.findFirst({
            where: {
              // OR: [
              //   { oem: part.oem.trim() },
              //   { oem: part.oem.trim().replace(/\s/g, "") },
              // ],
              codeArt: part.CODE_ART.toString(),
              marque: part.marque,
            },
          });
        }

        if (!product) {
          product = await tx.product.create({
            data: {
              codeArt: "" + part.CODE_ART.toString(),
              // referenceCode: `PROD-${part.CODE_ART || "GEN"}-${Math.random()
              //   .toString(36)
              //   .slice(2, 6)
              //   .toUpperCase()}`,
              referenceCode: `PROD-${part.CODE_ART}-${part.marque}`,
              oem: part.oem || "",
              marque: part.marque || "",
              autoFinal: part.auto_final || "",
              libelle: part.LIB1 || "",
            },
          });
        }

        // 2. Calcul des valeurs
        const qtyArrived = parseFloat(part.qte_arv) || parseInt(part.Qte) || 0;
        const nouveauPrix = parseFloat(part.prix_de_vente) || 0;

        // 3. Gestion du Stock
        let stock = await tx.stock.findFirst({
          where: { productId: product.id },
          include: { entrepots: true },
        });

        if (stock) {
          // Mise à jour du stock principal (quantité sans entrepot)
          await tx.stock.update({
            where: { id: stock.id },
            data: {
              qttsansEntrepot: { increment: qtyArrived },
              quantite: { increment: qtyArrived }, // Stockage dans qttsansEntrepot
              prixFinal: nouveauPrix,
              lib1: part.LIB1 || undefined,
              // Ne pas modifier quantite directement ici
              status:
                stock.quantite + stock.qttsansEntrepot + qtyArrived > 0
                  ? "DISPONIBLE"
                  : "RUPTURE",
            },
          });

          // Pas de création automatique dans l'entrepot ici
          // L'utilisateur devra faire une distribution manuelle
        } else {
          // Création du stock avec seulement qttsansEntrepot
          stock = await tx.stock.create({
            data: {
              productId: product.id,
              lib1: part.LIB1 || "",
              qttsansEntrepot: qtyArrived, // Stock initial dans qttsansEntrepot
              quantite: qtyArrived, // Quantité dans les entrepôts (vide au départ)
              prixFinal: nouveauPrix,
              status: qtyArrived > 0 ? "DISPONIBLE" : "RUPTURE",
              // Pas de création automatique dans StockEntrepot
            },
          });
        }

        // 4. Historique des prix si changement
        if (
          stock.prixFinal &&
          parseFloat(stock.prixFinal.toString()) !== nouveauPrix
        ) {
          await tx.priceHistory.create({
            data: {
              productId: product.id,
              oldPrice: parseFloat(stock.prixFinal.toString()),
              newPrice: nouveauPrix,
              changeReason: `Import ${importRecord.reference}`,
              changeType:
                nouveauPrix > parseFloat(stock.prixFinal.toString())
                  ? "INCREASE"
                  : "DECREASE",
            },
          });
        }

        // 5. Enregistrement de la pièce importée
        await tx.importedPart.create({
          data: {
            importId: importRecord.id,
            productId: product.id,
            codeArt: "" + part.CODE_ART.toString(),
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
      }

      return { success: true, importId: importRecord.id };
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

async function finaliserImportation(importId) {
  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Vérifier que l'import existe et n'est pas déjà complété
      const importRecord = await tx.import.findUnique({
        where: { id: importId },
        include: { parts: true },
      });

      if (!importRecord) {
        throw new Error("Importation introuvable");
      }

      if (importRecord.status === "COMPLETED") {
        throw new Error("Cette importation est déjà complétée");
      }

      // 2. Mettre à jour le statut de l'import
      await tx.import.update({
        where: { id: importId },
        data: { status: "COMPLETED" },
      });

      // 3. Traiter chaque partie de l'import
      for (const part of importRecord.parts) {
        if (!part.productId) continue;

        // Récupérer le produit et le stock actuel
        const product = await tx.product.findUnique({
          where: { id: part.productId },
          include: { stock: true },
        });

        if (!product) continue;

        const currentStock = product.stock;

        // Calculer le nouveau prix final (le plus élevé entre ancien et nouveau)
        const nouveauPrix = parseFloat(part.salePrice.toString()) || 0;
        const ancienPrix = currentStock?.prixFinal
          ? parseFloat(currentStock.prixFinal.toString())
          : 0;
        const prixFinal = Math.max(nouveauPrix, ancienPrix);

        // Créer un historique de prix si changement
        if (currentStock && nouveauPrix !== ancienPrix) {
          await tx.priceHistory.create({
            data: {
              productId: product.id,
              oldPrice: ancienPrix,
              newPrice: nouveauPrix,
              changeReason: `Import ${importRecord.reference}`,
              changeType: nouveauPrix > ancienPrix ? "INCREASE" : "DECREASE",
            },
          });
        }

        // Mettre à jour le stock
        await tx.stock.upsert({
          where: { productId: product.id },
          update: {
            quantite: {
              increment: part.qttArrive || 0,
            },
            prixFinal: prixFinal,
            status:
              (currentStock?.quantite || 0) + (part.qttArrive || 0) > 0
                ? "DISPONIBLE"
                : "RUPTURE",
            lib1: part.lib1 || undefined,
          },
          create: {
            productId: product.id,
            lib1: part.lib1 || "",
            quantite: part.qttArrive || 0,
            quantiteVendu: 0,
            prixFinal: prixFinal,
            status: "DISPONIBLE",
            entrepotId: null,
          },
        });
      }

      return {
        success: true,
        message: "Importation finalisée avec succès",
        importId: importRecord.id,
      };
    });
  } catch (error) {
    console.error("Erreur lors de la finalisation:", error);
    return {
      success: false,
      message: "Échec de la finalisation",
      error: error.message,
    };
  }
}

module.exports = {
  enregistrerImportation,
  finaliserImportation,
};

// module.exports = {
//   enregistrerImportation,
// };
