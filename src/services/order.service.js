const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

class OrderService {
  async previewInvoice(dto) {
    // Calculer le sous-total
    console.log("preview", dto);
    const subtotal = dto.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );

    // Calculer les remises selon le type de client
    // let discounts = [];
    // if (dto.customerType === "B2B") {
    //   discounts.push({
    //     description: "Remise Professionnel",
    //     amount: subtotal * 0.1,
    //     type: "POURCENTAGE",
    //   });
    // } else if (dto.customerType === "WHOLESALE") {
    //   discounts.push({
    //     description: "Remise Grossiste",
    //     amount: subtotal * 0.15,
    //     type: "POURCENTAGE",
    //   });
    // }

    // const totalDiscount = discounts.reduce((sum, d) => sum + d.amount, 0);
    const total = subtotal;
    const tax = total * 0.2; // Exemple TVA 20%

    return {
      subtotal,
      total,
      tax,
      items: dto.items.map((item) => ({
        ...item,
        total: item.unitPrice * item.quantity,
      })),
    };
  }

  //   async createOrderWithInvoice(dto) {
  //     return await prisma.$transaction(async (tx) => {
  //       // 1. Créer la commande
  //       const order = await tx.commandeVente.create({
  //         data: {
  //           reference: `CMD-${Date.now()}`,
  //           customerId: dto.customerId,
  //           managerId: dto.managerId,
  //           totalAmount: dto.totalAmount,
  //           type: dto.customerType,
  //           status: "EN_ATTENTE",
  //           pieces: {
  //             create: dto.items.map((item) => ({
  //               productId: item.productId,
  //               quantite: item.quantity,
  //               prixArticle: parseFloat(item.unitPrice),
  //               remise: item.discount || 0,
  //             })),
  //           },
  //         },
  //         include: { pieces: true },
  //       });

  //       // 2. Créer la facture
  //       const invoice = await tx.facture.create({
  //         data: {
  //           referenceFacture: `FAC-${Date.now()}`,
  //           commandeId: order.id,
  //           prixTotal: dto.totalAmount,
  //           status: "NON_PAYEE",
  //           userId: dto.managerId,
  //           remises: {
  //             create:
  //               dto.discounts?.map((discount) => ({
  //                 description: discount.description,
  //                 montant: discount.amount,
  //                 type: discount.type,
  //               })) || [],
  //           },
  //         },
  //       });

  //       // 3. Mettre à jour les stocks
  //       await Promise.all(
  //         dto.items.map((item) =>
  //           tx.product.update({
  //             where: { id: item.productId },
  //             data: { currentStock: { decrement: item.quantity } },
  //           })
  //         )
  //       );

  //       return { order, invoice };
  //     });
  //   }

  async createOrderWithInvoice(dto) {
    return await prisma.$transaction(async (tx) => {
      // Étape 1: Vérifier le stock disponible
      for (const item of dto.items) {
        const stock = await tx.stock.findUnique({
          where: { productId: item.productId },
        });

        if (!stock) {
          throw new Error(
            `Aucun stock trouvé pour le produit ID ${item.productId}`
          );
        }

        if (stock.quantite < item.quantity) {
          throw new Error(
            `Stock insuffisant pour le produit ID ${item.productId}. Disponible: ${stock.quantite}, Requis: ${item.quantity}`
          );
        }
      }

      // Étape 2: Créer la commande
      const order = await tx.commandeVente.create({
        data: {
          reference: `CMD-${Date.now()}`,
          customerId: dto.customerId,
          managerId: dto.managerId,
          totalAmount: dto.totalAmount,
          type: dto.customerType,
          status: "EN_ATTENTE",
          pieces: {
            create: dto.items.map((item) => ({
              productId: item.productId,
              quantite: item.quantity,
              prixArticle: parseFloat(item.unitPrice),
              remise: item.discount || 0,
            })),
          },
        },
        include: { pieces: true },
      });

      // Étape 3: Créer la facture
      const invoice = await tx.facture.create({
        data: {
          referenceFacture: `FAC-${Date.now()}`,
          commandeId: order.id,
          prixTotal: dto.totalAmount,
          status: "NON_PAYEE",
          userId: dto.managerId,
          remises: {
            create:
              dto.discounts?.map((discount) => ({
                description: discount.description,
                montant: discount.amount,
                type: discount.type,
              })) || [],
          },
        },
      });

      // Étape 4: Mettre à jour les stocks
      await Promise.all(
        dto.items.map((item) =>
          tx.stock.update({
            where: { productId: item.productId },
            data: {
              quantite: {
                decrement: item.quantity,
              },
              quantiteVendu: {
                increment: item.quantity,
              },
            },
          })
        )
      );

      return { order, invoice };
    });
  }

  // async createCommande(data) {
  //   const { customerId, managerId, libelle, type, pieces } = data;

  //   return await prisma.commandeVente.create({
  //     data: {
  //       reference: `CMD-${Date.now()}`, // Génération simple
  //       customer: customerId ? { connect: { id: customerId } } : undefined,
  //       manager: { connect: { id: managerId } },
  //       libelle,
  //       type,
  //       status: "EN_ATTENTE",
  //       totalAmount: pieces.reduce(
  //         (sum, p) => sum + p.prixArticle * p.quantite,
  //         0
  //       ),
  //       pieces: {
  //         create: pieces.map((p) => ({
  //           product: { connect: { id: p.productId } },
  //           quantite: p.quantite,
  //           prixArticle: p.prixArticle,
  //           remise: p.remise || 0,
  //         })),
  //       },
  //     },
  //     include: {
  //       pieces: true,
  //       customer: true,
  //     },
  //   });
  // }

  async getAllCommandes() {
    try {
      const commandes = await prisma.commandeVente.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          customer: true,
          manager: true,
          pieces: {
            include: {
              product: true,
            },
          },
          factures: true,
        },
      });

      return commandes;
    } catch (error) {
      console.error("Erreur lors de la récupération des commandes :", error);
      throw new Error("Impossible de récupérer les commandes");
    }
  }
}

module.exports = new OrderService();
