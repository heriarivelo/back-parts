const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const orderService = require("../services/order.service");
const { generateReference } = require("../utils/generateReference");

const getCommandesHistorique = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(req.query.pageSize) || 10, 1), 100);
    const search = req.query.search?.trim() || "";
    const status = req.query.status || "";

    const skip = (page - 1) * pageSize;

    const where = {
      // Je conseille d'exclure EN_ATTENTE de l'historique
      status: status
        ? status
        : {
            not: "EN_ATTENTE",
          },

      ...(search && {
        OR: [
          { reference: { contains: search, mode: "insensitive" } },
          { customer: { nom: { contains: search, mode: "insensitive" } } },
          { customer: { telephone: { contains: search, mode: "insensitive" } } },
          { customer: { email: { contains: search, mode: "insensitive" } } },
        ],
      }),
    };

    const [commandes, totalCount] = await Promise.all([
      prisma.commandeVente.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        select: {
          id: true,
          reference: true,
          createdAt: true,
          status: true,
          totalAmount: true,
          type: true,
          commandetype: true,

          customer: {
            select: {
              id: true,
              nom: true,
              telephone: true,
              email: true,
            },
          },

          manager: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },

          _count: {
            select: {
              pieces: true,
              factures: true,
            },
          },

          factures: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              id: true,
              referenceFacture: true,
              status: true,
              prixTotal: true,
              montantPaye: true,
              resteAPayer: true,
              createdAt: true,
            },
          },
        },
      }),

      prisma.commandeVente.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / pageSize);

    res.json({
      data: commandes.map((commande) => ({
        ...commande,
        latestFacture: commande.factures?.[0] || null,
        factures: undefined,
      })),
      pagination: {
        currentPage: page,
        pageSize,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    });
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

const getAllCommandes = async (req, res) => {
  try {
    const result = await orderService.getAllCommandes({
      page: req.query.page,
      pageSize: req.query.pageSize,
      search: req.query.search,
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getCommandeDetails = async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);

    if (!orderId || Number.isNaN(orderId)) {
      return res.status(400).json({ error: "ID commande invalide" });
    }

    const commande = await prisma.commandeVente.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        manager: true,
        pieces: {
          include: {
            product: true,
            customProduct: true,
          },
        },
        factures: {
          include: {
            remises: true,
            paiements: true,
          },
        },
      },
    });

    if (!commande) {
      return res.status(404).json({ error: "Commande non trouvée" });
    }

    res.json(commande);
  } catch (error) {
    console.error("Erreur détail commande:", error);
    res.status(500).json({ error: "Erreur serveur" });
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
            customProduct: true, // ✅ ajout pour les commandes particulières
          },
        },
        factures: true,
      },
    });

    if (!order) {
      return res.status(404).json({ error: "Commande non trouvée" });
    }

    // ✅ Calcul des totaux (standard ou particulier)
    const totals = {
      subtotal: order.pieces.reduce(
        (sum, item) => sum + (item.prixArticle * item.quantite),
        0
      ),
      itemsCount: order.pieces.length,
      alreadyInvoiced: order.factures.reduce(
        (sum, facture) => sum + facture.prixTotal,
        0
      ),
    };

    // ✅ Transformation de sortie (fusionner product & customProduct)
    const piecesWithResolvedProduct = order.pieces.map((piece) => {
      const resolvedProduct = piece.product || piece.customProduct || null;

      return {
        ...piece,
        resolvedProduct, // champ unifié pour ton front
      };
    });

    res.json({
      ...order,
      pieces: piecesWithResolvedProduct,
      totals,
    });
  } catch (error) {
    console.error("Erreur getOrderDetails:", error);
    res.status(500).json({
      error: "Erreur lors de la récupération de la commande",
      details: error.message,
    });
  }
};


const createOrders = async (req, res) => {
  console.log("📦 Début createOrders", JSON.stringify(req.body, null, 2));

  try {
    const {
      customerType = "B2B",
      commandeType = "STANDARD",
      customerId = null,
      managerId,
      items,
      info = {},
    } = req.body;

    if (!managerId)
      return res.status(400).json({ error: "managerId est obligatoire" });
    if (!items?.length)
      return res
        .status(400)
        .json({ error: "Au moins un article est obligatoire" });

    const totalAmount = items.reduce(
      (sum, item) =>
        sum + (parseFloat(item.unitPrice) || 0) * (item.quantity || 1),
      0
    );

    const order = await prisma.$transaction(async (tx) => {
      // 🔹 1. Gestion du client
      let finalCustomerId = customerId;
      if (!finalCustomerId) {
        const tel = info.telephone?.trim();
        const email = info.email?.trim().toLowerCase();
        const nom = info.nom?.trim();

        if (tel || email) {
          const existingClient = await tx.customer.findFirst({
            where: {
              OR: [{ telephone: tel || "" }, { email: email || "" }],
            },
          });
          if (existingClient) finalCustomerId = existingClient.id;
        }

        if (!finalCustomerId && nom && (tel || email)) {
          const newClient = await tx.customer.create({
            data: {
              nom,
              type: customerType,
              telephone: tel || null,
              email: email || null,
              siret: info.nif?.trim() || null,
              adresse: info.adresse?.trim() || null,
            },
          });
          finalCustomerId = newClient.id;
        }
      }

      // 🔹 2. Préparation des items
      const piecesData = [];

      for (const item of items) {
        if (item.productId) {
          
          const stock = await tx.stock.findFirst({
            where: { productId: item.productId },
          });

          const prixFinal = parseFloat(stock?.prixFinal) || 0;

          piecesData.push({
            productId: item.productId,
            quantite: item.quantity,
            prixArticle: prixFinal,
          });
        } else {
          // ⚙️ Cas commande particulière → création d’un CustomProduct
          const customProduct = await tx.customProduct.create({
            data: {
              codeArt: item.reference || "",
              libelle: item.productName || "Produit non référencé",
              marque: item.marque || null,
              oem: item.oem || null,
              autoFinal: item.autoFinal || null,
              prixUnitaire: parseFloat(item.unitPrice) || 0,
              notes: item.notes || null,
            },
          });

          piecesData.push({
            customProductId: customProduct.id, // 👈 lien vers le CustomProduct
            quantite: item.quantity,
            prixArticle: parseFloat(item.unitPrice) || 0,
          });
        }
      }

      const referenceCommande = await generateReference(
        tx,
        "commandeVente",
        "reference",
        "CMD"
      );

      // 🔹 3. Création de la commande
      const newOrder = await tx.commandeVente.create({
        data: {
          reference: referenceCommande,
          customerId: finalCustomerId,
          managerId,
          totalAmount,
          type: customerType,
          commandetype: commandeType,
          status: "EN_ATTENTE",
          libelle:
            info.nom && !finalCustomerId
              ? `Client occasionnel: ${info.nom}`
              : null,
          pieces: {
            create: piecesData,
          },
        },
        include: { pieces: true },
      });

      console.log("✅ Commande créée:", newOrder.reference);

      return newOrder;
    });

    return res.status(201).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("❌ Erreur création commande:", error);
    res.status(500).json({
      success: false,
      error: "Échec de la création de commande",
      details: process.env.NODE_ENV === "development" ? error.message : null,
    });
  }
};


const validateOrder = async (req, res) => {
  console.log("\n=== DEBUT validateOrder ===");
  // console.log("Headers:", req.headers);
  console.log("Body:", JSON.stringify(req.body, null, 2));

  try {
    const { orderId } = req.params;
    const { paymentDetails, discounts, pieces } = req.body;

    // Validation renforcée
    if (!paymentDetails?.managerId) {
      throw new Error("Manager ID est requis");
    }

    // Récupération de la commande
    const order = await prisma.commandeVente.findUnique({
      where: { id: parseInt(orderId) },
      include: {
        pieces: {
          include: {
            product: true,
            customProduct:true,
          },
        },
      },
    });

    if (!order) {
      throw new Error(`Commande ${orderId} non trouvée`);
    }

    // Vérification des pièces
    if (!pieces?.length || pieces.length !== order.pieces.length) {
      throw new Error("Configuration des pièces invalide");
    }

    // Calcul des totaux
    const total = order.totalAmount || 0;
    const discountAmount =
      discounts?.reduce(
        (sum, d) =>
          d.type === "percentage"
            ? sum + (total * d.value) / 100
            : sum + d.value,
        0
      ) || 0;

    const finalAmount = total - discountAmount;
    const paidAmount = paymentDetails.amount || 0;

    // Transaction
    const result = await prisma.$transaction(async (tx) => {
      const referenceFacture = await generateReference(
        tx,
        "facture",
        "referenceFacture",
        "FAC"
      );
      // Création facture
      const invoice = await tx.facture.create({
        data: {
          referenceFacture,
          commandeVente: { connect: { id: order.id } },
          prixTotal: finalAmount,
          montantPaye: paidAmount,
          resteAPayer: finalAmount - paidAmount,
          status:
            paidAmount >= finalAmount
              ? "PAYEE"
              : paidAmount > 0
              ? "PARTIELLEMENT_PAYEE"
              : "NON_PAYEE",
          paidAt: paidAmount >= finalAmount ? new Date() : null,
          remises: discounts?.length
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

      // Paiement
      if (paidAmount > 0) {
        await tx.paiement.create({
          data: {
            facture: { connect: { id: invoice.id } },
            montant: paidAmount,
            mode: paymentDetails.method,
            reference: paymentDetails.reference,
            manager: { connect: { id: paymentDetails.managerId } },
          },
        });
      }

      // Gestion des stocks
      for (const piece of pieces) {
        if (!piece.productId) {
          console.log(
            `🟢 Pièce ${piece.customProductId || '(custom)'} ignorée pour la gestion de stock (commande particulière).`
          );
          continue; // ⛔ ne pas traiter les produits sans stock
        }
        await processStock(tx, piece, invoice);
      }

      // Mise à jour commande
      await tx.commandeVente.update({
        where: { id: order.id },
        data: { status: paidAmount >= finalAmount ? "LIVREE" : "TRAITEMENT" },
      });

      return { success: true, invoice };
    });

    console.log("=== TRANSACTION REUSSIE ===");
    res.status(201).json(result);
  } catch (error) {
    console.error("ERREUR:", {
      message: error.message,
      stack: error.stack,
      timestamp: new Date(),
    });
    res.status(500).json({
      error: error.message.includes("Stock") ? error.message : "Erreur serveur",
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

async function processStock(tx, piece, invoice) {
  try {
    console.log(
      `Traitement du produit ${piece.productId} dans l'entrepôt ${
        piece.entrepotId || "aucun"
      }`
    );

    // 1. Trouver le stock global du produit
    const globalStock = await tx.stock.findFirst({
      where: {
        productId: piece.productId,
        quantite: { gte: piece.quantite },
      },
    });

    if (!globalStock) {
      throw new Error(
        `Stock global insuffisant pour le produit ${piece.productId}`
      );
    }

    // 2. Mise à jour du stock global
    await tx.stock.update({
      where: { id: globalStock.id },
      data: {
        quantite: { decrement: piece.quantite },
        quantiteVendu: { increment: piece.quantite },
      },
    });

    // 3. Si un entrepôt est spécifié
    if (piece.entrepotId) {
      // Trouver le stock spécifique à l'entrepôt
      const stockEntrepot = await tx.stockEntrepot.findFirst({
        where: {
          stockId: globalStock.id, // Utilisez stockId au lieu de productId
          entrepotId: piece.entrepotId,
          quantite: { gte: piece.quantite },
        },
      });

      if (!stockEntrepot) {
        throw new Error(
          `Stock insuffisant dans l'entrepôt ${piece.entrepotId} pour le produit ${piece.productId}`
        );
      }

      // Mise à jour du stock de l'entrepôt
      await tx.stockEntrepot.update({
        where: { id: stockEntrepot.id },
        data: { quantite: { decrement: piece.quantite } },
      });
    }

    // 4. Enregistrer le mouvement de stock
    await tx.stockMovement.create({
      data: {
        productId: piece.productId,
        type: "SALE",
        quantity: -piece.quantite,
        source: piece.entrepotId
          ? `FACTURE:${invoice.id}|ENTREPOT:${piece.entrepotId}`
          : `FACTURE:${invoice.id}`,
        reason: `Vente ${invoice.referenceFacture}`,
      },
    });
  } catch (error) {
    console.error(
      `Erreur lors du traitement du stock pour le produit ${piece.productId}:`,
      error
    );
    throw error; // Important: propager l'erreur pour annuler la transaction
  }
}

const cancelOrder = async (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    const { reason } = req.body;

    if (isNaN(orderId)) {
      return res.status(400).json({ error: "ID commande invalide" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.commandeVente.findUnique({
        where: { id: orderId },
        include: {
          pieces: true,
          factures: true,
        },
      });

      if (!order) {
        throw new Error("Commande introuvable");
      }

      if (order.status === "ANNULEE") {
        throw new Error("Cette commande est déjà annulée");
      }

      if (order.status === "LIVREE") {
        throw new Error("Une commande livrée ne peut pas être annulée");
      }

      const shouldRestoreStock = order.status === "TRAITEMENT";

      if (shouldRestoreStock) {
        for (const piece of order.pieces) {
          if (!piece.productId) {
            continue;
          }

          await tx.stock.updateMany({
            where: { productId: piece.productId },
            data: {
              quantite: {
                increment: piece.quantite,
              },
              quantiteVendu: {
                decrement: piece.quantite,
              },
            },
          });

          await tx.stockMovement.create({
            data: {
              productId: piece.productId,
              type: "CANCEL_ORDER",
              quantity: piece.quantite,
              source: `ANNULATION_COMMANDE:${order.reference}`,
              reason: reason || "Annulation commande",
            },
          });
        }

        await tx.facture.updateMany({
          where: { commandeId: order.id },
          data: {
            status: "ANNULEE",
          },
        });
      }

      const cancelledOrder = await tx.commandeVente.update({
        where: { id: order.id },
        data: {
          status: "ANNULEE",
        },
      });

      return cancelledOrder;
    });

    return res.status(200).json({
      success: true,
      message: "Commande annulée avec succès",
      order: result,
    });
  } catch (error) {
    console.error("Erreur annulation commande:", error);
    return res.status(400).json({
      success: false,
      error: error.message || "Erreur lors de l’annulation de la commande",
    });
  }
};


module.exports = {
  getCommandesHistorique,
  createOrders,
  // createOrder,
  previewInvoice,
  cancelOrder,
  getAllCommandes,
  getCommandeDetails,
  getOrderDetails,
  validateOrder
};
