const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();


const getAllFacturesWithDetails = async () => {
  const factures = await prisma.facture.findMany({
    include: {
      commandeVente: {
        include: {
          customer: true,
          pieces: {
            include: {
              product: true,
              customProduct: true,
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

  return factures.map(facture => {
    const commande = facture.commandeVente;
    const pieces = (commande.pieces || []).map(piece => {
      // unifier le produit
      const unified = piece.product || piece.customProduct || null;

      // on crée un nouveau champ product unifié, et on supprime ou ignore les deux originaux
      const { product, customProduct, ...restPiece } = piece;

      return {
        ...restPiece,
        product: unified,
      };
    });

    return {
      ...facture,
      commandeVente: {
        ...commande,
        pieces,
      },
    };
  });
};


// const getAllFacturesWithDetails = async () => {
//   return await prisma.facture.findMany({
//     include: {
//       commandeVente: {
//         include: {
//           customer: true,
//           pieces: {
//             include: {
//               product: true,
//               customProduct: true,
//             },
//           },
//         },
//       },
//       remises: true,
//       paiements: true,
//       createdBy: true,
//     },
//     orderBy: {
//       createdAt: "desc",
//     },
//   });
// };

const annulerFacture = async (invoiId, userId, raison) => {
  if (!invoiId || !userId || !raison) {
    throw new Error(
      "Paramètres manquants: invoiId, userId et raison sont obligatoires"
    );
  }

  try {
    return await prisma.$transaction(async (prisma) => {
      // 1. Vérification de la facture et récupération des données nécessaires
      const facture = await prisma.facture.findUnique({
        where: { id: invoiId },
        include: {
          commandeVente: {
            include: {
              pieces: {
                include: {
                  product: {
                    include: {
                      stocks: {
                        include: {
                          entrepots: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          paiements: true,
          remises: true,
        },
      });

      if (!facture) throw new Error("Facture non trouvée");
      if (facture.status === "ANNULEE") throw new Error("Facture déjà annulée");

      // 2. Gestion des remboursements (si paiements existants)
      if (facture.paiements.length > 0 && facture.montantPaye > 0) {
        await prisma.paiement.createMany({
          data: facture.paiements.map((paiement) => ({
            factureId: invoiId,
            montant: -paiement.montant, // Montant négatif pour remboursement
            mode: paiement.mode,
            reference: `RMB-${paiement.reference || Date.now()}`,
            managerId: userId,
            createdAt: new Date(),
          })),
        });
      }

      // 3. Mise à jour de la facture
      const factureAnnulee = await prisma.facture.update({
        where: { id: invoiId },
        data: {
          status: "ANNULEE",
          montantPaye: 0,
          resteAPayer: 0,
          updatedAt: new Date(),
        },
      });

      // 4. Mise à jour de la commande associée si elle existe
      if (facture.commandeId) {
        await prisma.commandeVente.update({
          where: { id: facture.commandeId },
          data: {
            status: "ANNULEE",
            updatedAt: new Date(),
          },
        });
      }

      // 5. Restauration des stocks et création des mouvements
      await Promise.all(
        facture.commandeVente.pieces.map(async (piece) => {
          const stockDisponible = piece.product.stocks.find(
            (s) => s.status === "DISPONIBLE"
          );
          if (!stockDisponible) {
            console.warn(
              `Aucun stock disponible pour le produit ${piece.productId}`
            );
            return;
          }

          // Mise à jour du stock principal
          await prisma.stock.update({
            where: { id: stockDisponible.id },
            data: {
              quantite: { increment: piece.quantite },
              quantiteVendu: { decrement: piece.quantite },
              qttsansEntrepot: { increment: piece.quantite },
              updatedAt: new Date(),
            },
          });

          // Mouvement de stock principal
          await prisma.stockMovement.create({
            data: {
              productId: piece.productId,
              type: "RETURN",
              quantity: piece.quantite,
              source: `FACTURE:${invoiId}`,
              reason: `Annulation facture ${facture.referenceFacture}: ${raison}`,
              createdAt: new Date(),
            },
          });

          // Mise à jour des stocks par entrepôt si nécessaire
          // if (
          //   stockDisponible.entrepots &&
          //   stockDisponible.entrepots.length > 0
          // ) {
          //   await Promise.all(
          //     stockDisponible.entrepots.map(async (entrepot) => {
          //       await prisma.stockEntrepot.update({
          //         where: { id: entrepot.id },
          //         data: {
          //           quantite: { increment: piece.quantite },
          //           updatedAt: new Date(),
          //         },
          //       });

          //       await prisma.stockMovement.create({
          //         data: {
          //           productId: piece.productId,
          //           type: "RETURN",
          //           quantity: piece.quantite,
          //           source: `FACTURE:${invoiId}|ENTREPOT:${entrepot.entrepotId}`,
          //           reason: `Annulation facture ${facture.referenceFacture}: ${raison}`,
          //           createdAt: new Date(),
          //         },
          //       });
          //     })
          //   );
          // }
        })
      );

      return {
        success: true,
        message: "Facture annulée avec succès",
        facture: factureAnnulee,
        montantRembourse: facture.montantPaye,
        details: {
          piecesRestituees: facture.commandeVente.pieces.length,
          paiementsRembourses: facture.paiements.length,
        },
      };
    });
  } catch (error) {
    console.error("Erreur lors de l'annulation de la facture:", error);
    throw new Error(`Échec de l'annulation: ${error.message}`);
  }
};

module.exports = {
  getAllFacturesWithDetails,
  annulerFacture,
};
