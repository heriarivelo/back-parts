const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const orderService = require("../services/order.service");

const getCommandesHistorique = async (req, res) => {
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

    res.json(commandes);
  } catch (error) {
    console.error("Erreur historique commande:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

const previewInvoice = async (req, res) => {
  try {
    const preview = await orderService.previewInvoice(req.body);
    res.json(preview);
  } catch (error) {
    console.error("Error previewing invoice:", error);
    res.status(500).json({ error: "Erreur lors de la prévisualisation" });
  }
};

// const createOrder = async (req, res) => {
//   try {
//     const result = await orderService.createOrderWithInvoice(req.body);
//     res.json({
//       success: true,
//       orderId: result.order.id,
//       invoiceId: result.invoice.id,
//     });
//   } catch (error) {
//     console.error("Error creating order:", error);
//     res
//       .status(500)
//       .json({ error: "Erreur lors de la création de la commande" });
//   }
// };

// const createCommande = async (req, res) => {
//   try {
//     const createdCommande = await orderService.createCommande(req.body);
//     res.status(201).json(createdCommande);
//   } catch (error) {
//     console.error("Erreur création commande :", error);
//     res.status(500).json({ error: error.message });
//   }
// };

const getAllCommandes = async (req, res) => {
  try {
    const commandes = await orderService.getAllCommandes();
    res.status(200).json({ success: true, data: commandes });
  } catch (error) {
    console.error("Erreur dans getAllCommandes:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur lors de la récupération des commandes.",
      error: error.message,
    });
  }
};

const getOrderDetails = async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);

    const order = await prisma.commandeVente.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        pieces: {
          include: {
            product: {
              include: {
                stocks: true,
                importDetails: {
                  orderBy: { createdAt: "desc" },
                  take: 1,
                },
              },
            },
          },
        },
        factures: true,
      },
    });

    if (!order) {
      return res.status(404).json({ error: "Commande non trouvée" });
    }

    // Calcul des totaux pour la commande
    const totals = {
      subtotal: order.pieces.reduce(
        (sum, item) => sum + item.quantite * item.prixArticle,
        0
      ),
      itemsCount: order.pieces.length,
      alreadyInvoiced: order.factures.reduce(
        (sum, facture) => sum + facture.prixTotal,
        0
      ),
    };

    res.json({
      ...order,
      totals,
    });
  } catch (error) {
    res.status(500).json({
      error: "Erreur lors de la récupération de la commande",
      details: error.message,
    });
  }
};

const createOrders = async (req, res) => {
  try {
    const {
      customerType = "B2B",
      customerId = null,
      managerId,
      items,
      info = {},
    } = req.body;

    // 1. Validation
    if (!managerId || !items?.length) {
      return res
        .status(400)
        .json({ error: "managerId et items sont obligatoires" });
    }

    // 2. Calcul du total
    const totalAmount = items.reduce(
      (sum, item) =>
        sum + (parseFloat(item.unitPrice) || 0) * (item.quantity || 1),
      0
    );

    // 3. Création de la commande
    const order = await prisma.$transaction(async (tx) => {
      // A. Création de la commande principale
      const newOrder = await tx.commandeVente.create({
        data: {
          reference: `CMD-${Date.now()}`,
          customerId,
          managerId,
          totalAmount,
          type: customerType,
          status: "EN_ATTENTE",
          libelle: info.nom ? `Client occasionnel: ${info.nom}` : null, // Utilisation du champ libelle existant
          pieces: {
            create: items.map((item) => ({
              productId: item.productId,
              quantite: item.quantity,
              prixArticle: parseFloat(item.unitPrice) || 0,
              // description: info.contact ? `Contact: ${info.contact}` : null, // Stockage dans description
            })),
          },
        },
        include: { pieces: true },
      });

      // B. Réservation du stock
      await tx.stockMovement.createMany({
        data: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          type: "ADJUSTMENT",
          source: `Commande: ${newOrder.reference}`,
          reason: info.vehicule ? `Véhicule: ${info.vehicule}` : null, // Utilisation du champ notes
        })),
      });

      return newOrder;
    });

    // 4. Réponse avec infos client incluses
    res.status(201).json({
      success: true,
      order: {
        ...order,
        clientInfo: {
          // Simule metadata sans modifier la BDD
          nom: info.nom,
          contact: info.contact,
          nif: info.nif,
        },
      },
    });
  } catch (error) {
    console.error("Erreur création commande:", error);
    res.status(500).json({
      success: false,
      error: "Échec de la création",
      details: process.env.NODE_ENV === "development" ? error.message : null,
    });
  }
};

// Valider une commande et créer une facture
const validateOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { paymentDetails, discounts } = req.body;

    console.log(orderId, "orderId");
    // console.log(discounts, "paymentDetails");
    // console.log(paymentDetails, "paymentDetails");

    // Récupérer la commande avec les articles
    const order = await prisma.commandeVente.findUnique({
      where: { id: parseInt(orderId) },
      include: {
        pieces: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Calculer le total avec remises
    let total = order.totalAmount || 0;
    let discountAmount = 0;

    if (discounts && discounts.length > 0) {
      discountAmount = discounts.reduce((sum, discount) => {
        return discount.type === "percentage"
          ? sum + (total * discount.value) / 100
          : sum + discount.value;
      }, 0);

      total -= discountAmount;
    }

    // Créer la facture avec transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Créer la facture
      const invoice = await tx.facture.create({
        data: {
          referenceFacture: `FAC-${Date.now()}`,
          // commandeId: parseInt(orderId),
          commandeVente: {
            connect: { id: order.id }, // ajoutez aussi cette ligne
          },
          prixTotal: total,
          montantPaye: paymentDetails.amount || 0, //nalaina tao am generateFullInvoice
          resteAPayer: total - (paymentDetails.amount || 0),
          status:
            paymentDetails.amount >= total
              ? "PAYEE"
              : paymentDetails.amount > 0
              ? "PARTIELLEMENT_PAYEE"
              : "NON_PAYEE",
          paidAt: paymentDetails?.amount === total ? new Date() : null, //nalaina tao am generateFullInvoice
          remises:
            discounts?.length > 0
              ? {
                  create: discounts.map((d) => ({
                    description: d.description,
                    taux: d.type === "percentage" ? d.value : null,
                    montant: d.type === "fixed" ? d.value : null,
                    type:
                      d.type === "percentage" ? "POURCENTAGE" : "MONTANT_FIXE",
                  })),
                }
              : undefined,
          createdBy: { connect: { id: paymentDetails.managerId } },
        },
      });

      // 2. Enregistrer le paiement si applicable
      if (paymentDetails.amount > 0) {
        await tx.paiement.create({
          data: {
            // factureId: invoice.id,
            facture: {
              connect: { id: invoice.id }, // Connecte au paiement à la facture créée
            },
            montant: paymentDetails.amount,
            mode: paymentDetails.method,
            reference: paymentDetails.reference,
            manager: {
              connect: { id: paymentDetails.managerId },
            },
          },
        });
      }

      const usedLots = [];

      for (const item of order.pieces) {
        let remainingQty = item.quantite;
        const usedLots = [];

        const availableLots = await tx.importedPart.findMany({
          where: {
            productId: item.productId,
            qttArrive: { gt: 0 },
          },
          include: { import: true },
          orderBy: { import: { importedAt: "asc" } },
        });

        // Validation rapide du stock total
        const totalAvailable = availableLots.reduce(
          (sum, lot) => sum + lot.qttArrive,
          0
        );
        if (totalAvailable < remainingQty) {
          throw new Error(`Stock total insuffisant pour le produit ${item.productId}. 
      Demandé: ${remainingQty}, Disponible: ${totalAvailable}`);
        }

        // Mise à jour asynchrone des lots
        const updates = [];
        for (const lot of availableLots) {
          if (remainingQty <= 0) break;

          const qty = Math.min(remainingQty, lot.qttArrive);
          updates.push(
            tx.importedPart.update({
              where: { id: lot.id },
              data: { qttArrive: { decrement: qty } },
            }),
            tx.stockMovement.create({
              data: {
                productId: item.productId,
                quantity: qty,
                type: "SALE",
                source: `Facture: ${invoice.referenceFacture}`,
                reason: `Lot ${lot.import.reference}`,
              },
            })
          );

          usedLots.push({
            lot: lot.import.reference,
            quantity: qty,
            cost: lot.prixAchat * qty, // Pour calcul du COGS
          });

          remainingQty -= qty;
        }

        await Promise.all(updates);

        // Mise à jour du stock global (une seule opération)
        await tx.stock.updateMany({
          where: { productId: item.productId },
          data: {
            quantite: { decrement: item.quantite },
            quantiteVendu: { increment: item.quantite },
          },
        });
      }

      // 4. Mettre à jour le statut de la commande
      await tx.commandeVente.update({
        where: { id: order.id },
        data: {
          status: paymentDetails.amount >= total ? "LIVREE" : "TRAITEMENT",
        },
      });

      return { order, invoice, usedLots }; //nalaina tao am createorderwithInvoice
    });

    res.status(201).json(result);
  } catch (error) {
    console.error("Error validating order:", error);
    res.status(500).json({ error: "Failed to validate order" });
  }
};

module.exports = {
  getCommandesHistorique,
  createOrders,
  // createOrder,
  previewInvoice,
  // createCommande,
  getAllCommandes,
  getOrderDetails,
  validateOrder,
};
