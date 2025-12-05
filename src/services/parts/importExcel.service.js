// const { PrismaClient } = require("@prisma/client");
// const prisma = new PrismaClient();

// async function enregistrerImportation(importData, importParts) {
//   try {
//     return await prisma.$transaction(async (prisma) => {
//       // 1. Création de l'enregistrement d'importation principal
//       const importRecord = await prisma.import.create({
//         data: {
//           description: importData.description,
//           marge: importData.marge,
//           fretAvecDD: importData.fretAvecDD || 0,
//           fretSansDD: importData.fretSansDD || 0,
//           douane: importData.douane || 0,
//           tva: importData.tva || 0,
//           tauxDeChange: importData.tauxDeChange || 1,
//           fileName: importData.fileName || "",
//           //   status: "Importée",
//           importedAt: new Date(),
//         },
//       });

//       // 2. Traitement de chaque article importé
//       for (const part of importParts) {
//         if (!part.CODE_ART) continue;

//         // a. Création ou mise à jour du produit
//         const product = await prisma.product.upsert({
//           where: { codeArt: "" + part.CODE_ART },
//           update: {
//             marque: part.marque || undefined,
//             oem: part.oem || undefined,
//             autoFinal: part.auto_final || undefined,
//             lib: part.LIB1 || undefined,
//           },
//           create: {
//             codeArt: "" + part.CODE_ART,
//             marque: part.marque || "",
//             oem: part.oem || "",
//             autoFinal: part.auto_final || "",
//             lib: part.LIB1 || "",
//           },
//         });

//         // b. Création de la partie importée
//         await prisma.importedPart.create({
//           data: {
//             importId: importRecord.id,
//             codeArt: "" + part.CODE_ART,
//             marque: part.marque || "",
//             oem: part.oem || "",
//             autoFinal: part.auto_final || "",
//             lib1: part.LIB1 || "",
//             quantity: part.Qte || 0,
//             qttArrive: part.qte_arv || 0,
//             poids: part.POIDS_NET || 0,
//             purchasePrice: part.PRIX_UNIT || 0,
//             salePrice: part.prix_de_vente || 0,
//             margin: importData.marge || 0,
//           },
//         });

//         // c. Mise à jour du stock
//         await prisma.stock.upsert({
//           where: { codeArt: "" + part.CODE_ART },
//           update: {
//             quantite: { increment: part.qte_arv || 0 },
//             prixFinal: part.prix_de_vente || undefined,
//             lib1: part.LIB1 || undefined,
//           },
//           create: {
//             codeArt: "" + part.CODE_ART,
//             lib1: part.LIB1 || "",
//             quantite: part.qte_arv || 0,
//             quantiteVendu: 0,
//             prixFinal: part.prix_de_vente || 0,
//             entrepots: 0,
//           },
//         });
//       }

//       return {
//         success: true,
//         importId: importRecord.id,
//         message: "Importation enregistrée avec succès",
//       };
//     });
//   } catch (error) {
//     console.error("Erreur lors de l'enregistrement:", error);
//     return {
//       success: false,
//       message: "Échec de l'enregistrement",
//       error: error.message,
//     };
//   }
// }

// module.exports = {
//   enregistrerImportation,
// };
